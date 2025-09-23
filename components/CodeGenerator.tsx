import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Card from './common/Card';
import Spinner from './common/Spinner';
import CodeBlock from './common/CodeBlock';
import { generateProjectFromPrompt, editFileContent, generateProjectFromRepoUrl } from '../services/geminiService';
import { useAppContext } from '../context/AppContext';
import { ProjectFiles } from '../types';
import { ICONS } from '../constants';

// Type definition for FileSystemDirectoryHandle
interface FileSystemDirectoryHandle {
    kind: 'directory';
    name: string;
    values: () => AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>;
    getDirectoryHandle: (name: string, options?: { create?: boolean }) => Promise<FileSystemDirectoryHandle>;
    getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileSystemFileHandle>;
}
interface FileSystemFileHandle {
    kind: 'file';
    name: string;
    getFile: () => Promise<File>;
    createWritable: () => Promise<FileSystemWritableFileStream>;
}
interface FileSystemWritableFileStream extends WritableStream {
    write: (data: any) => Promise<void>;
    close: () => Promise<void>;
}

// FIX: Initialize useRef with the callback to ensure it's never undefined inside the interval.
// This resolves a potential race condition and a confusing "Expected 1 arguments, but got 0" error
// that can occur with some TypeScript configurations when useRef is not initialized.
const useInterval = (callback: () => void, delay: number | null) => {
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};

// Utility to get file extension
const getFileExtension = (filename: string) => {
    return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
};

// Utility to build a tree structure from file paths
const buildFileTree = (files: ProjectFiles) => {
    const tree = {};
    if (!files) return tree;
    Object.keys(files).forEach(path => {
        path.split('/').reduce((r, name) => {
            if (!r[name]) {
                r[name] = { children: {} };
            }
            return r[name].children;
        }, tree);
    });
    return tree;
};


const FileIcon: React.FC<{ filename: string }> = ({ filename }) => {
    const extension = getFileExtension(filename);
    switch (extension) {
        case 'html': return <span className="text-orange-500">{ICONS.fileHtml}</span>;
        case 'css': return <span className="text-blue-500">{ICONS.fileCss}</span>;
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
            return <span className="text-yellow-500">{ICONS.fileJs}</span>;
        case 'json': return <span className="text-green-500">{ICONS.fileJson}</span>;
        default: return <span className="text-secondary dark:text-dark-secondary">{ICONS.fileCode}</span>;
    }
};

const FileTree: React.FC<{
    tree: any;
    onSelect: (path: string) => void;
    activeFile: string | null;
    expandedFolders: { [key: string]: boolean };
    onToggleFolder: (path: string) => void;
    path?: string;
    level?: number;
}> = ({ tree, onSelect, activeFile, expandedFolders, onToggleFolder, path = '', level = 0 }) => {
    return (
        <ul className="text-sm">
            {Object.keys(tree).sort((a,b) => {
                const aIsFolder = Object.keys(tree[a].children).length > 0;
                const bIsFolder = Object.keys(tree[b].children).length > 0;
                if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
                return a.localeCompare(b);
            }).map(name => {
                const currentPath = path ? `${path}/${name}` : name;
                const isFolder = Object.keys(tree[name].children).length > 0;
                const isOpen = expandedFolders[currentPath] || false;

                if (isFolder) {
                    return (
                        <li key={currentPath}>
                            <button onClick={() => onToggleFolder(currentPath)} className="w-full text-left flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700/50">
                                <span className="transition-transform duration-200">{isOpen ? '▼' : '►'}</span>
                                <span className="text-yellow-500">{isOpen ? ICONS.folderOpen : ICONS.folderClosed}</span>
                                <span>{name}</span>
                            </button>
                            {isOpen && (
                                <div style={{ paddingLeft: `${(level + 1) * 12}px` }}>
                                    <FileTree tree={tree[name].children} onSelect={onSelect} activeFile={activeFile} expandedFolders={expandedFolders} onToggleFolder={onToggleFolder} path={currentPath} level={level + 1} />
                                </div>
                            )}
                        </li>
                    );
                } else {
                    return (
                        <li key={currentPath}>
                            <button onClick={() => onSelect(currentPath)} className={`w-full text-left flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors ${activeFile === currentPath ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-slate-700/50'}`}>
                                <FileIcon filename={name} />
                                <span className="truncate">{name}</span>
                            </button>
                        </li>
                    );
                }
            })}
        </ul>
    );
};


const CodeGenerator: React.FC = () => {
    const { language } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState('');
    const [projectFiles, setProjectFiles] = useState<ProjectFiles | null>(null);
    const [activeFile, setActiveFile] = useState<string | null>(null);
    const [editorContent, setEditorContent] = useState('');
    const [aiPrompt, setAiPrompt] = useState('');
    const [activeTab, setActiveTab] = useState<'ai' | 'preview' | 'git'>('ai');
    
    // State for initial project creation
    const [initialViewTab, setInitialViewTab] = useState<'prompt' | 'git' | 'local'>('prompt');
    const [initialPrompt, setInitialPrompt] = useState('');
    const [repoUrl, setRepoUrl] = useState('');
    
    // State for local file system and environment restrictions
    const [isFsaRestricted, setIsFsaRestricted] = useState(false);
    const hasFSApi = 'showDirectoryPicker' in window;
    const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // State for file tree
    const [expandedFolders, setExpandedFolders] = useState<{ [key: string]: boolean }>({});

    // State for advanced preview
    const [previewSrcDoc, setPreviewSrcDoc] = useState('');
    const [isPreviewBuilding, setIsPreviewBuilding] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const blobUrlsRef = useRef<string[]>([]);
    
    // Environment check for File System Access API restrictions
    useEffect(() => {
        let restricted = false;
        try {
            // If window.top is not accessible or not equal to window.self, we are in a cross-origin iframe.
            restricted = window.top !== window.self;
        } catch (e) {
            // Accessing window.top can throw an error in a sandboxed iframe.
            restricted = true;
        }
        if (restricted) {
            console.warn("File System Access API is restricted in this sandboxed environment.");
            setIsFsaRestricted(true);
        }
    }, []);

    // Auto-save and session recovery
    useEffect(() => {
        try {
            const savedProject = localStorage.getItem('codeGenProject');
            if (savedProject) {
                setProjectFiles(JSON.parse(savedProject));
            }
        } catch (e) {
            console.error("Failed to load project from local storage", e);
        }
    }, []);

    useInterval(() => {
        if (projectFiles && !directoryHandle) { // Only auto-save for non-local projects
            localStorage.setItem('codeGenProject', JSON.stringify(projectFiles));
        }
    }, 30000); // Auto-save every 30 seconds


    const fileTree = useMemo(() => buildFileTree(projectFiles), [projectFiles]);
    
    useEffect(() => {
        if (activeFile && projectFiles) {
            setEditorContent(projectFiles[activeFile]);
            
            // Auto-expand folders
            const parts = activeFile.split('/');
            let currentPath = '';
            const newExpandedFolders = { ...expandedFolders };
            parts.slice(0, -1).forEach(part => {
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                newExpandedFolders[currentPath] = true;
            });
            setExpandedFolders(newExpandedFolders);
        }
    }, [activeFile]); // only run when activeFile changes

    // Cleanup blobs on unmount
    useEffect(() => {
        return () => { blobUrlsRef.current.forEach(URL.revokeObjectURL); };
    }, []);

    // Effect to build and update the preview srcDoc
    useEffect(() => {
        const buildPreview = async () => {
            if (!projectFiles || !projectFiles['index.html']) {
                setPreviewSrcDoc('');
                return;
            }

            setIsPreviewBuilding(true);
            setPreviewError(null);
            blobUrlsRef.current.forEach(URL.revokeObjectURL);
            blobUrlsRef.current = [];

            try {
                if (typeof (window as any).Babel === 'undefined') {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://unpkg.com/@babel/standalone/babel.min.js';
                        script.onload = resolve;
                        script.onerror = () => reject(new Error("Failed to load Babel for preview."));
                        document.head.appendChild(script);
                    });
                }

                const fileBlobs = new Map<string, string>();
                for (const path in projectFiles) {
                    const content = projectFiles[path];
                    let blobContent: string = content;
                    let blobType: string = 'text/plain';

                    if (/\.(js|jsx|ts|tsx)$/.test(path)) {
                        blobContent = (window as any).Babel.transform(content, { presets: ["react", "typescript"], filename: path }).code;
                        blobType = 'application/javascript';
                    } else if (path.endsWith('.css')) {
                        blobType = 'text/css';
                    } else continue;
                    
                    const blob = new Blob([blobContent], { type: blobType });
                    const url = URL.createObjectURL(blob);
                    fileBlobs.set(path, url);
                    blobUrlsRef.current.push(url);
                }

                let html = projectFiles['index.html'];
                html = html.replace(/(src|href)=["'](\.\/)?([^"']+)["']/g, (match, attr, prefix, path) => {
                    const fullPath = path.startsWith('/') ? path.substring(1) : path;
                    return fileBlobs.has(fullPath) ? `${attr}="${fileBlobs.get(fullPath)}"` : match;
                });

                const importMap = { imports: { "react": "https://aistudiocdn.com/react@^19.1.1", "react-dom/client": "https://aistudiocdn.com/react-dom@^19.1.1/client" } };
                const importMapScript = `<script type="importmap">${JSON.stringify(importMap)}</script>`;
                html = html.includes('</head>') ? html.replace('</head>', `${importMapScript}</head>`) : importMapScript + html;
                
                setPreviewSrcDoc(html);
            } catch (err) {
                const message = err instanceof Error ? err.message : "An unknown error occurred during build.";
                setPreviewError(message.replace(/^(Error: )?(\S+): /, ''));
            } finally {
                setIsPreviewBuilding(false);
            }
        };
        buildPreview();
    }, [projectFiles]);

    const resetProjectState = () => {
        setProjectFiles(null);
        setActiveFile(null);
        setEditorContent('');
        setDirectoryHandle(null);
        setError('');
        setInitialPrompt('');
        setRepoUrl('');
        localStorage.removeItem('codeGenProject');
    };

    const handleProjectLoad = (files: ProjectFiles) => {
        setProjectFiles(files);
        const firstFile = Object.keys(files).find(f => f.toLowerCase().includes('index.html')) || Object.keys(files)[0];
        setActiveFile(firstFile);
    };

    const handleGenerateFromPrompt = async () => {
        if (!initialPrompt.trim()) return;
        setIsLoading(true);
        setLoadingMessage('Building your project...');
        setError('');
        try {
            const files = await generateProjectFromPrompt(initialPrompt, language);
            handleProjectLoad(files);
        } catch (err) { setError(err instanceof Error ? err.message : 'Failed to generate project.'); } finally { setIsLoading(false); }
    };

    const handleCloneFromRepo = async () => {
        if (!repoUrl.trim()) return;
        setIsLoading(true);
        setLoadingMessage('Cloning repository...');
        setError('');
        try {
            const files = await generateProjectFromRepoUrl(repoUrl, language);
            handleProjectLoad(files);
        } catch (err) { setError(err instanceof Error ? err.message : 'Failed to clone repository.'); } finally { setIsLoading(false); }
    };

    const handleOpenLocalProject = async () => {
        if (!hasFSApi || isFsaRestricted) { 
            setError("Local file access is not available in this environment."); 
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Opening local directory...');
        setError('');
        try {
            const dirHandle = await (window as any).showDirectoryPicker();
            setDirectoryHandle(dirHandle);

            const getFiles = async (dirHandle: FileSystemDirectoryHandle, path = ''): Promise<ProjectFiles> => {
                const files: ProjectFiles = {};
                for await (const entry of dirHandle.values()) {
                    const newPath = path ? `${path}/${entry.name}` : entry.name;
                    if (entry.kind === 'file') {
                        const file = await entry.getFile();
                        if (file.type.startsWith('text/') || file.type.includes('javascript') || file.type.includes('json') || file.type === '') {
                             files[newPath] = await file.text();
                        }
                    } else if (entry.kind === 'directory' && entry.name !== '.git' && entry.name !== 'node_modules') {
                        Object.assign(files, await getFiles(entry, newPath));
                    }
                }
                return files;
            };
            const files = await getFiles(dirHandle);
            handleProjectLoad(files);
        } catch (err) {
            console.error(err);
            if (err instanceof DOMException && err.name === 'AbortError') {
                 // Ignore user cancellation, do nothing.
            } else {
              setError(err instanceof Error ? err.message : 'Failed to open directory.');
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveChanges = async () => {
        if (!directoryHandle || !projectFiles) return;
        setSaveStatus('saving');
        setError('');
        try {
            const saveFile = async (dirHandle: FileSystemDirectoryHandle, path: string, content: string) => {
                const parts = path.split('/');
                const fileName = parts.pop()!;
                let currentDir = dirHandle;
                for (const part of parts) {
                    currentDir = await currentDir.getDirectoryHandle(part, { create: true });
                }
                const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(content);
                await writable.close();
            };
            await Promise.all(Object.entries(projectFiles).map(([path, content]) => saveFile(directoryHandle, path, content)));
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save changes.');
            setSaveStatus('idle');
        }
    };

    const handleAiEdit = async () => {
        if (!aiPrompt.trim() || !activeFile || !projectFiles) return;
        setIsLoading(true);
        setError('');
        try {
            const newContent = await editFileContent(aiPrompt, projectFiles, activeFile, language);
            setEditorContent(newContent);
            setProjectFiles(prev => prev ? { ...prev, [activeFile]: newContent } : null);
            setAiPrompt('');
        } catch (err) { setError(err instanceof Error ? err.message : 'Failed to apply changes.'); } finally { setIsLoading(false); }
    };
    
    const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditorContent(e.target.value);
        if (activeFile && projectFiles) {
            setProjectFiles(prev => ({ ...prev!, [activeFile]: e.target.value }));
        }
    };

    const toggleFolder = (folderPath: string) => {
        setExpandedFolders(prev => ({ ...prev, [folderPath]: !prev[folderPath] }));
    };

    if (!projectFiles && !isLoading) {
        return (
            <div className="flex justify-center items-center h-full animate-fadeIn">
                <Card className="max-w-xl w-full">
                    <h2 className="text-2xl font-bold mb-2 text-text-primary dark:text-dark-text-primary">Code Generator Studio</h2>
                    <p className="text-text-secondary dark:text-dark-text-secondary mb-6">Start a new project with AI, clone a repository, or open a local folder.</p>
                    
                    <div className="flex space-x-1 bg-background dark:bg-dark-background p-1 rounded-lg border border-border-color dark:border-dark-border-color mb-4">
                        <button onClick={() => setInitialViewTab('prompt')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${initialViewTab === 'prompt' ? 'bg-primary text-white shadow' : 'hover:bg-gray-100'}`}>From Prompt</button>
                        <button onClick={() => setInitialViewTab('git')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${initialViewTab === 'git' ? 'bg-primary text-white shadow' : 'hover:bg-gray-100'}`}>From Git Repo</button>
                        {hasFSApi && <button 
                            onClick={() => setInitialViewTab('local')} 
                            disabled={isFsaRestricted}
                            title={isFsaRestricted ? "Local file access is disabled in this environment" : "Open a local folder"}
                            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${initialViewTab === 'local' && !isFsaRestricted ? 'bg-primary text-white shadow' : 'hover:bg-gray-100'} ${isFsaRestricted ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            From Local
                        </button>}
                    </div>

                    {isFsaRestricted && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg text-center text-xs text-yellow-800 dark:text-yellow-200">
                            Local file system features are disabled due to browser security restrictions in this sandboxed environment. You can still create projects from a prompt or Git repository.
                        </div>
                    )}

                    {initialViewTab === 'prompt' && <div className="space-y-4 animate-fadeIn">
                        <textarea value={initialPrompt} onChange={(e) => setInitialPrompt(e.target.value)} placeholder="e.g., A simple portfolio website..." className="w-full h-24 p-3 bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                        <button onClick={handleGenerateFromPrompt} disabled={!initialPrompt.trim()} className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex justify-center items-center">Create Project</button>
                    </div>}
                    {initialViewTab === 'git' && <div className="space-y-4 animate-fadeIn">
                        <input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/example/repo" className="w-full p-3 bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                        <button onClick={handleCloneFromRepo} disabled={!repoUrl.trim()} className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex justify-center items-center">Clone Repository</button>
                    </div>}
                    {initialViewTab === 'local' && hasFSApi && !isFsaRestricted && <div className="text-center animate-fadeIn">
                        <p className="text-text-secondary dark:text-dark-text-secondary mb-4">Open a project from your local file system to start editing.</p>
                        <button onClick={handleOpenLocalProject} className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover transition-colors flex justify-center items-center gap-2">{ICONS.openFolder} Open Project Folder</button>
                    </div>}
                    {error && <p className="text-red-500 mt-2 text-xs text-center">{error}</p>}
                </Card>
            </div>
        )
    }
    
    if (isLoading && !projectFiles) {
         return (
             <div className="flex flex-col justify-center items-center h-full text-center">
                 <Spinner className="h-12 w-12 border-primary mb-4" />
                 <p className="text-lg font-semibold">{loadingMessage}</p>
                 <p className="text-text-secondary dark:text-dark-text-secondary">Please wait, this may take a moment.</p>
             </div>
         )
    }

    return (
        <div className="flex h-full max-h-[calc(100vh-4rem)] bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-2xl overflow-hidden animate-fadeIn">
            {/* Left Panel: File Explorer */}
            <aside className="w-64 bg-surface dark:bg-dark-surface p-2 border-r border-border-color dark:border-dark-border-color flex flex-col">
                <div className="flex items-center justify-between px-2 pb-2">
                    <h3 className="text-sm font-semibold text-text-secondary dark:text-dark-text-secondary uppercase">Explorer</h3>
                    <div className="flex items-center gap-1">
                        {directoryHandle && (
                            <button onClick={handleSaveChanges} title="Save Project" className="p-1 rounded-md text-secondary hover:bg-gray-200 dark:hover:bg-slate-700">
                                {saveStatus === 'saving' ? <Spinner className="h-4 w-4 border-primary"/> : ICONS.save}
                            </button>
                        )}
                        <button onClick={resetProjectState} title="New Project" className="p-1 rounded-md text-secondary hover:bg-gray-200 dark:hover:bg-slate-700">{ICONS.newProject}</button>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {projectFiles && <FileTree tree={fileTree} onSelect={setActiveFile} activeFile={activeFile} expandedFolders={expandedFolders} onToggleFolder={toggleFolder} />}
                </div>
            </aside>

            {/* Middle Panel: Editor */}
            <main className="flex-1 flex flex-col">
                <div className="flex items-center justify-between p-2 border-b border-border-color dark:border-dark-border-color bg-surface dark:bg-dark-surface text-sm text-text-primary dark:text-dark-text-primary">
                    <span>{activeFile || 'Select a file to edit'}</span>
                    <span className={`text-xs transition-opacity duration-500 ${saveStatus !== 'idle' ? 'opacity-100' : 'opacity-0'}`}>
                        {saveStatus === 'saving' && 'Saving...'}
                        {saveStatus === 'saved' && 'Saved.'}
                    </span>
                </div>
                <div className="flex-grow relative">
                    <textarea value={editorContent} onChange={handleEditorChange} className="w-full h-full p-4 bg-background dark:bg-dark-background text-text-secondary dark:text-dark-text-secondary font-mono text-sm resize-none focus:outline-none" spellCheck="false" />
                </div>
            </main>

            {/* Right Panel: AI/Preview */}
            <aside className="w-1/3 min-w-[400px] border-l border-border-color dark:border-dark-border-color flex flex-col bg-surface dark:bg-dark-surface">
                <div className="flex border-b border-border-color dark:border-dark-border-color">
                    <button onClick={() => setActiveTab('ai')} className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'ai' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-700'}`}>AI Controls</button>
                    <button onClick={() => setActiveTab('preview')} className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'preview' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-700'}`}>Preview</button>
                    <button onClick={() => setActiveTab('git')} className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'git' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-700'}`}>Git</button>
                </div>
                <div className="flex-grow p-4 overflow-y-auto">
                    {activeTab === 'ai' && (
                        <div className="flex flex-col h-full">
                            <h4 className="font-semibold mb-2">Edit with AI</h4>
                            <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-3">Describe the changes you want to make to the active file ({activeFile || 'none'}).</p>
                            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder={`e.g., "Change the h1 title to 'Welcome'"`} className="w-full h-32 p-3 bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                            <button onClick={handleAiEdit} disabled={isLoading || !aiPrompt.trim() || !activeFile} className="w-full bg-primary text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex justify-center items-center mt-3">
                                {isLoading ? <Spinner className="h-5 w-5 border-white" /> : 'Apply AI Changes'}
                            </button>
                            {error && <p className="text-red-500 mt-2 text-xs text-center">{error}</p>}
                        </div>
                    )}
                    {activeTab === 'preview' && (
                        <div className="w-full h-full relative">
                            {isPreviewBuilding && <div className="absolute inset-0 flex flex-col justify-center items-center bg-surface/80 z-10"><Spinner className="h-8 w-8 border-primary"/><p className="mt-2 text-sm">Building preview...</p></div>}
                            {previewError && <div className="absolute inset-0 flex flex-col justify-center items-center bg-red-50 p-4 text-center"><p className="font-semibold text-red-600">Preview Error</p><p className="text-xs text-red-500 mt-1 font-mono">{previewError}</p></div>}
                            <iframe srcDoc={previewSrcDoc} title="Live Preview" sandbox="allow-scripts allow-same-origin" className={`w-full h-full border rounded-md bg-white transition-opacity ${isPreviewBuilding || previewError ? 'opacity-30' : 'opacity-100'}`} />
                        </div>
                    )}
                     {activeTab === 'git' && (
                        <div className="space-y-4">
                            <h4 className="font-semibold">Git Integration</h4>
                            <p className="text-xs text-text-secondary dark:text-dark-text-secondary">This is a simulated environment. To push your changes, run these commands in your local terminal after cloning your repository.</p>
                            <CodeBlock code={`git add .\ngit commit -m "feat: implement changes via AI assistant"\ngit push`} />
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
};

export default CodeGenerator;