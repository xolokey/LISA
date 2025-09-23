import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Card from './common/Card';
import Spinner from './common/Spinner';
import CodeBlock from './common/CodeBlock';
import { generateProjectFromPrompt, editFileContent } from '../services/geminiService';
import { useAppContext } from '../context/AppContext';
import { ProjectFiles } from '../types';
import { ICONS } from '../constants';

// Utility to get file extension
const getFileExtension = (filename: string) => {
    return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
};

// Utility to build a tree structure from file paths
const buildFileTree = (files: ProjectFiles) => {
    const tree = {};
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
    path?: string;
    level?: number;
}> = ({ tree, onSelect, activeFile, path = '', level = 0 }) => {
    const [openFolders, setOpenFolders] = useState<{ [key: string]: boolean }>({});

    const toggleFolder = (folder: string) => {
        setOpenFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
    };
    
    useEffect(() => {
        // Automatically open folders leading to the active file
        if (activeFile) {
            const parts = activeFile.split('/');
            let currentPath = '';
            const newOpenFolders = {};
            parts.slice(0, -1).forEach(part => {
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                newOpenFolders[currentPath] = true;
            });
            setOpenFolders(prev => ({ ...prev, ...newOpenFolders }));
        }
    }, [activeFile]);

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
                const isOpen = openFolders[currentPath] || false;

                if (isFolder) {
                    return (
                        <li key={currentPath}>
                            <button onClick={() => toggleFolder(currentPath)} className="w-full text-left flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700/50">
                                <span className="text-yellow-500">{isOpen ? ICONS.folderOpen : ICONS.folderClosed}</span>
                                <span>{name}</span>
                            </button>
                            {isOpen && (
                                <div style={{ paddingLeft: `${(level + 1) * 12}px` }}>
                                    <FileTree tree={tree[name].children} onSelect={onSelect} activeFile={activeFile} path={currentPath} level={level + 1} />
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
    const [error, setError] = useState('');

    const [projectFiles, setProjectFiles] = useState<ProjectFiles | null>(null);
    const [activeFile, setActiveFile] = useState<string | null>(null);
    const [editorContent, setEditorContent] = useState('');
    const [aiPrompt, setAiPrompt] = useState('');
    const [activeTab, setActiveTab] = useState<'ai' | 'preview' | 'git'>('ai');
    const [initialPrompt, setInitialPrompt] = useState('');

    // --- New state for advanced preview ---
    const [previewSrcDoc, setPreviewSrcDoc] = useState('');
    const [isPreviewBuilding, setIsPreviewBuilding] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const blobUrlsRef = useRef<string[]>([]);

    const fileTree = useMemo(() => projectFiles ? buildFileTree(projectFiles) : {}, [projectFiles]);
    
    useEffect(() => {
        if (activeFile && projectFiles) {
            setEditorContent(projectFiles[activeFile]);
        }
    }, [activeFile, projectFiles]);

    // Cleanup blobs on unmount
    useEffect(() => {
        return () => {
            blobUrlsRef.current.forEach(URL.revokeObjectURL);
        };
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

            // Revoke previous blob URLs to prevent memory leaks
            blobUrlsRef.current.forEach(URL.revokeObjectURL);
            blobUrlsRef.current = [];

            try {
                // Ensure Babel is available on the window object
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
                
                // Transpile and create blobs for all JS/TS/CSS files
                for (const path in projectFiles) {
                    const content = projectFiles[path];
                    let blobContent: string = content;
                    let blobType: string = 'text/plain';

                    if (/\.(js|jsx|ts|tsx)$/.test(path)) {
                        blobContent = (window as any).Babel.transform(content, {
                            presets: ["react", "typescript"],
                            filename: path,
                        }).code;
                        blobType = 'application/javascript';
                    } else if (path.endsWith('.css')) {
                        blobType = 'text/css';
                    } else {
                        continue; // Only process scriptable/styleable files for blobs
                    }
                    
                    const blob = new Blob([blobContent], { type: blobType });
                    const url = URL.createObjectURL(blob);
                    fileBlobs.set(path, url);
                    blobUrlsRef.current.push(url);
                }

                let html = projectFiles['index.html'];

                // Replace relative paths with blob URLs
                html = html.replace(/(src|href)=["'](\.\/)?([^"']+)["']/g, (match, attr, prefix, path) => {
                    const fullPath = path.startsWith('/') ? path.substring(1) : path;
                    if (fileBlobs.has(fullPath)) {
                        return `${attr}="${fileBlobs.get(fullPath)}"`;
                    }
                    return match;
                });

                // Inject an import map for bare modules like React
                const importMap = {
                    imports: {
                        "react": "https://aistudiocdn.com/react@^19.1.1",
                        "react-dom/client": "https://aistudiocdn.com/react-dom@^19.1.1/client",
                    }
                };
                const importMapScript = `<script type="importmap">${JSON.stringify(importMap)}</script>`;
                
                if (html.includes('</head>')) {
                    html = html.replace('</head>', `${importMapScript}</head>`);
                } else {
                    html = importMapScript + html;
                }
                
                setPreviewSrcDoc(html);

            } catch (err) {
                console.error("Preview build failed:", err);
                const message = err instanceof Error ? err.message : "An unknown error occurred during build.";
                // Extract a more user-friendly message from Babel errors
                setPreviewError(message.replace(/^(Error: )?(\S+): /, ''));
            } finally {
                setIsPreviewBuilding(false);
            }
        };

        buildPreview();

    }, [projectFiles]);

    const handleProjectGeneration = async () => {
        if (!initialPrompt.trim()) return;
        setIsLoading(true);
        setError('');
        setProjectFiles(null);
        setActiveFile(null);
        setEditorContent('');
        try {
            const files = await generateProjectFromPrompt(initialPrompt, language);
            setProjectFiles(files);
            // Select index.html or the first file by default
            const firstFile = Object.keys(files).find(f => f.includes('index.html')) || Object.keys(files)[0];
            setActiveFile(firstFile);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate project.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAiEdit = async () => {
        if (!aiPrompt.trim() || !activeFile || !projectFiles) return;
        setIsLoading(true);
        setError('');
        try {
            const newContent = await editFileContent(aiPrompt, projectFiles, activeFile, language);
            setEditorContent(newContent); // Show AI changes in editor
            // Update project state
            setProjectFiles(prev => prev ? { ...prev, [activeFile]: newContent } : null);
            setAiPrompt('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to apply changes.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditorContent(e.target.value);
        if (activeFile && projectFiles) {
            setProjectFiles(prev => ({ ...prev!, [activeFile]: e.target.value }));
        }
    };

    if (!projectFiles && !isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Card className="max-w-xl w-full">
                    <h2 className="text-2xl font-bold mb-2 text-text-primary dark:text-dark-text-primary">Code Generator Studio</h2>
                    <p className="text-text-secondary dark:text-dark-text-secondary mb-6">Describe the application you want to build or provide a GitHub URL to start.</p>
                    <div className="space-y-4">
                        <textarea
                            value={initialPrompt}
                            onChange={(e) => setInitialPrompt(e.target.value)}
                            placeholder="e.g., A simple portfolio website using HTML, CSS, and JS with a contact form."
                            className="w-full h-24 p-3 bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                            onClick={handleProjectGeneration}
                            disabled={!initialPrompt.trim()}
                            className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover transition-colors disabled:bg-gray-400 dark:disabled:bg-slate-600 flex justify-center items-center"
                        >
                            Create Project
                        </button>
                    </div>
                </Card>
            </div>
        )
    }
    
    if (isLoading && !projectFiles) {
         return (
             <div className="flex flex-col justify-center items-center h-full text-center">
                 <Spinner className="h-12 w-12 border-primary mb-4" />
                 <p className="text-lg font-semibold">Building your project...</p>
                 <p className="text-text-secondary dark:text-dark-text-secondary">The AI is generating the file structure and code.</p>
             </div>
         )
    }

    return (
        <div className="flex h-full max-h-[calc(100vh-4rem)] bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-2xl overflow-hidden animate-fadeIn">
            {/* Left Panel: File Explorer */}
            <aside className="w-64 bg-surface dark:bg-dark-surface p-2 border-r border-border-color dark:border-dark-border-color flex flex-col">
                <h3 className="text-sm font-semibold px-2 pb-2 text-text-secondary dark:text-dark-text-secondary uppercase">Explorer</h3>
                <div className="flex-grow overflow-y-auto">
                    {projectFiles && <FileTree tree={fileTree} onSelect={setActiveFile} activeFile={activeFile} />}
                </div>
            </aside>

            {/* Middle Panel: Editor */}
            <main className="flex-1 flex flex-col">
                <div className="p-2 border-b border-border-color dark:border-dark-border-color bg-surface dark:bg-dark-surface text-sm text-text-primary dark:text-dark-text-primary">
                    {activeFile || 'Select a file to edit'}
                </div>
                <div className="flex-grow relative">
                    <textarea
                        value={editorContent}
                        onChange={handleEditorChange}
                        className="w-full h-full p-4 bg-background dark:bg-dark-background text-text-secondary dark:text-dark-text-secondary font-mono text-sm resize-none focus:outline-none"
                        spellCheck="false"
                    />
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
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder={`e.g., "Change the h1 title to 'Welcome' and make it blue."`}
                                className="w-full h-32 p-3 bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                            <button onClick={handleAiEdit} disabled={isLoading || !aiPrompt.trim() || !activeFile}
                                className="w-full bg-primary text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-primary-hover transition-colors disabled:bg-gray-400 dark:disabled:bg-slate-600 flex justify-center items-center mt-3">
                                {isLoading ? <Spinner className="h-5 w-5 border-white" /> : 'Apply AI Changes'}
                            </button>
                            {error && <p className="text-red-500 mt-2 text-xs text-center">{error}</p>}
                        </div>
                    )}
                    {activeTab === 'preview' && (
                        <div className="w-full h-full relative">
                            {isPreviewBuilding && (
                                <div className="absolute inset-0 flex flex-col justify-center items-center bg-surface/80 dark:bg-dark-surface/80 z-10">
                                    <Spinner className="h-8 w-8 border-primary"/>
                                    <p className="mt-2 text-sm text-text-secondary dark:text-dark-text-secondary">Building preview...</p>
                                </div>
                            )}
                            {previewError && (
                                <div className="absolute inset-0 flex flex-col justify-center items-center bg-red-50 dark:bg-red-900/50 p-4 text-center">
                                     <p className="font-semibold text-red-600 dark:text-red-300">Preview Error</p>
                                     <p className="text-xs text-red-500 dark:text-red-400 mt-1 font-mono">{previewError}</p>
                                </div>
                            )}
                             <iframe
                                srcDoc={previewSrcDoc}
                                title="Live Preview"
                                sandbox="allow-scripts allow-same-origin"
                                className={`w-full h-full border border-border-color dark:border-dark-border-color rounded-md bg-white transition-opacity ${isPreviewBuilding || previewError ? 'opacity-30' : 'opacity-100'}`}
                            />
                        </div>
                    )}
                     {activeTab === 'git' && (
                        <div className="space-y-4">
                            <h4 className="font-semibold">Git Integration</h4>
                            <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                                This is a simulated environment. To push your changes, run these commands in your local terminal after cloning your repository.
                            </p>
                             <CodeBlock code={`git add .\ngit commit -m "feat: implement changes via AI assistant"\ngit push`} />
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
};

export default CodeGenerator;
