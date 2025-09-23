import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Card from './common/Card';
import Spinner from './common/Spinner';
import CodeBlock from './common/CodeBlock';
import { generateProjectFromPrompt, performProjectEdit, generateProjectFromRepoUrl } from '../services/geminiService';
import { useAppContext } from '../context/AppContext';
import { ProjectFiles } from '../types';
import { ICONS } from '../constants';

// Type definitions
interface HistoryState {
  stack: string[];
  pointer: number;
}
type ConsoleMessage = { type: 'log' | 'error' | 'warn' | 'info' | 'system'; data: any[] };
type AiChatMessage = { role: 'user' | 'model'; content: string };
type DeviceMode = 'desktop' | 'tablet' | 'mobile';

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
    return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
};

// Utility to build a tree structure from file paths
const buildFileTree = (files: ProjectFiles | null) => {
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
                                <span className={`transition-transform duration-200 text-xs ${isOpen ? 'rotate-90' : ''}`}>►</span>
                                <span className="text-yellow-500">{isOpen ? ICONS.folderOpen : ICONS.folderClosed}</span>
                                <span>{name}</span>
                            </button>
                            {isOpen && (
                                <div className="pl-4">
                                    <FileTree tree={tree[name].children} onSelect={onSelect} activeFile={activeFile} expandedFolders={expandedFolders} onToggleFolder={onToggleFolder} path={currentPath} level={level + 1} />
                                </div>
                            )}
                        </li>
                    );
                } else {
                    return (
                        <li key={currentPath}>
                            <button onClick={() => onSelect(currentPath)} className={`w-full text-left flex items-center gap-2 py-1.5 pl-6 pr-2 rounded-md transition-colors ${activeFile === currentPath ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-slate-700/50'}`}>
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
    const [activeRightTab, setActiveRightTab] = useState<'ai' | 'preview' | 'git' | 'terminal'>('ai');
    
    // State for initial project creation
    const [initialViewTab, setInitialViewTab] = useState<'prompt' | 'git' | 'local'>('prompt');
    const [initialPrompt, setInitialPrompt] = useState('');
    const [repoUrl, setRepoUrl] = useState('');
    
    // AI Chat state
    const [aiChatMessages, setAiChatMessages] = useState<AiChatMessage[]>([]);
    const [aiPrompt, setAiPrompt] = useState('');
    const aiChatContainerRef = useRef<HTMLDivElement>(null);
    
    // Ref for file input
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for file tree
    const [expandedFolders, setExpandedFolders] = useState<{ [key: string]: boolean }>({});

    // State for advanced preview
    const [previewSrcDoc, setPreviewSrcDoc] = useState('');
    const [isPreviewBuilding, setIsPreviewBuilding] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
    const blobUrlsRef = useRef<string[]>([]);
    const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
    
    // State for undo/redo
    const [history, setHistory] = useState<{ [filePath: string]: HistoryState }>({});
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-save and session recovery
    useEffect(() => {
        try {
            const savedProject = localStorage.getItem('codeGenProject');
            if (savedProject) {
                handleProjectLoad(JSON.parse(savedProject));
            }
        } catch (e) {
            console.error("Failed to load project from local storage", e);
        }
    }, []);

    // Fix: Set non-standard directory attributes programmatically to avoid TypeScript errors.
    useEffect(() => {
        if (fileInputRef.current) {
            fileInputRef.current.setAttribute('webkitdirectory', '');
            fileInputRef.current.setAttribute('directory', '');
        }
    }, []);

    useInterval(() => {
        if (projectFiles) {
            localStorage.setItem('codeGenProject', JSON.stringify(projectFiles));
        }
    }, 30000); 

    // Message listener for console logs from iframe
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'CONSOLE') {
                const { level, data } = event.data;
                if (level === 'clear') {
                    setConsoleMessages([]);
                } else {
                    setConsoleMessages(prev => [...prev, { type: level, data: data || [] }]);
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Scroll AI chat
    useEffect(() => {
        aiChatContainerRef.current?.scrollTo({ top: aiChatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [aiChatMessages, isLoading]);

    const fileTree = useMemo(() => buildFileTree(projectFiles), [projectFiles]);
    
    useEffect(() => {
        if (activeFile && projectFiles) {
            setEditorContent(projectFiles[activeFile]);
            // Auto-expand parent folders of the active file
            const parts = activeFile.split('/');
            if (parts.length > 1) {
                const newExpanded: { [key: string]: boolean } = {};
                let currentPath = '';
                parts.slice(0, -1).forEach(part => {
                    currentPath = currentPath ? `${currentPath}/${part}` : part;
                    newExpanded[currentPath] = true;
                });
                setExpandedFolders(prev => ({ ...prev, ...newExpanded }));
            }
        }
    }, [activeFile, projectFiles]);

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
            setConsoleMessages([{ type: 'system', data: ['Building preview...'] }]);

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

                const consoleOverrideScript = `
                  const _console = window.console;
                  window.console = {
                    ..._console,
                    log: (...args) => { _console.log(...args); window.parent.postMessage({ type: 'CONSOLE', level: 'log', data: args.map(a => typeof a === 'undefined' ? 'undefined' : a) }, '*'); },
                    warn: (...args) => { _console.warn(...args); window.parent.postMessage({ type: 'CONSOLE', level: 'warn', data: args.map(a => typeof a === 'undefined' ? 'undefined' : a) }, '*'); },
                    error: (...args) => { _console.error(...args); window.parent.postMessage({ type: 'CONSOLE', level: 'error', data: args.map(a => typeof a === 'undefined' ? 'undefined' : a) }, '*'); },
                    info: (...args) => { _console.info(...args); window.parent.postMessage({ type: 'CONSOLE', level: 'info', data: args.map(a => typeof a === 'undefined' ? 'undefined' : a) }, '*'); },
                    clear: () => { _console.clear(); window.parent.postMessage({ type: 'CONSOLE', level: 'clear' }, '*'); }
                  };
                  window.addEventListener('error', e => {
                    window.console.error(e.message, 'at', e.filename + ':' + e.lineno);
                    return true;
                  });
                `;
                const injectedScripts = `${importMapScript}<script>${consoleOverrideScript}</script>`;
                
                html = html.includes('</head>') ? html.replace('</head>', `${injectedScripts}</head>`) : injectedScripts + html;
                
                setPreviewSrcDoc(html);
                setConsoleMessages(prev => [...prev, { type: 'system', data: ['Preview built successfully.'] }]);
            } catch (err) {
                const message = err instanceof Error ? err.message : "An unknown error occurred during build.";
                setPreviewError(message.replace(/^(Error: )?(\S+): /, ''));
                setConsoleMessages(prev => [...prev, { type: 'error', data: ['Build Failed:', message] }]);
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
        setError('');
        setInitialPrompt('');
        setRepoUrl('');
        setHistory({});
        localStorage.removeItem('codeGenProject');
        setExpandedFolders({});
        setAiChatMessages([]);
    };

    const handleProjectLoad = (files: ProjectFiles) => {
        setProjectFiles(files);
        const firstFile = Object.keys(files).find(f => f.toLowerCase().includes('index.html')) || Object.keys(files)[0];
        
        const initialHistory = Object.keys(files).reduce((acc, path) => {
            acc[path] = { stack: [files[path]], pointer: 0 };
            return acc;
        }, {} as { [filePath: string]: HistoryState });
        setHistory(initialHistory);
        
        setActiveFile(firstFile);
        setAiChatMessages([{ role: 'model', content: "Project loaded. How can I help you modify the code?" }]);
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

    const handleOpenLocalProjectClick = () => {
        fileInputRef.current?.click();
    };

    const handleDirectorySelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = event.target.files;
        if (!fileList || fileList.length === 0) return;

        setIsLoading(true);
        setLoadingMessage('Reading project files...');
        setError('');

        try {
            const projectFiles: ProjectFiles = {};
            
            const isLikelyTextFile = async (file: File): Promise<boolean> => {
                 const textExtensions = ['html', 'css', 'js', 'jsx', 'ts', 'tsx', 'json', 'md', 'txt', 'svg', 'gitignore', 'npmrc', 'env', 'yaml', 'yml', 'xml', 'sh', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rb', 'php'];
                 const name = file.name.toLowerCase();
                 const ext = getFileExtension(name);

                 if (textExtensions.includes(ext)) return true;
                 if (name.includes('dockerfile') || name.includes('license') || name.includes('readme')) return true;
                 if (file.type.startsWith('text/')) return true;
                 if (file.type.includes('javascript') || file.type.includes('json') || file.type.includes('xml')) return true;
                
                 if (file.type === '' || file.type === 'application/octet-stream') {
                     if (file.size > 1024 * 1024) return false; // > 1MB likely binary
                     const buffer = await file.slice(0, 512).arrayBuffer();
                     const view = new Uint8Array(buffer);
                     for (let i = 0; i < view.length; i++) {
                         if (view[i] === 0) return false; // Null bytes = binary
                     }
                     return true;
                 }
                 return false;
            };

            for (const file of Array.from(fileList)) {
                const path = (file as any).webkitRelativePath;
                if (!path || path.includes('/.git/') || path.includes('/node_modules/')) {
                    continue;
                }
                
                if (await isLikelyTextFile(file)) {
                    const pathParts = path.split('/');
                    const relativePath = pathParts.slice(1).join('/'); // Remove root folder
                    if(relativePath) {
                        projectFiles[relativePath] = await file.text();
                    }
                }
            }
            
            if (Object.keys(projectFiles).length === 0) {
                throw new Error("No readable text files found in the selected directory.");
            }

            handleProjectLoad(projectFiles);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to read directory.');
        } finally {
            setIsLoading(false);
            if (event.target) event.target.value = '';
        }
    };
    
    const pushToHistory = useCallback((filePath: string, content: string) => {
        setHistory(prev => {
            const fileHistory = prev[filePath] || { stack: [], pointer: -1 };
            if (fileHistory.stack[fileHistory.pointer] === content) {
                return prev; // No change, don't add to history
            }
            const newStack = fileHistory.stack.slice(0, fileHistory.pointer + 1);
            newStack.push(content);
            return {
                ...prev,
                [filePath]: {
                    stack: newStack,
                    pointer: newStack.length - 1
                }
            };
        });
    }, []);

    const handleSendAiMessage = async () => {
        if (!aiPrompt.trim() || !projectFiles) return;

        const newMessages: AiChatMessage[] = [...aiChatMessages, { role: 'user', content: aiPrompt }];
        setAiChatMessages(newMessages);
        const currentPrompt = aiPrompt;
        setAiPrompt('');
        setIsLoading(true);
        setError('');

        try {
            const result = await performProjectEdit(newMessages, currentPrompt, projectFiles, language);
            
            const newProjectFiles = { ...projectFiles };
            result.fileChanges.forEach(change => {
                newProjectFiles[change.filePath] = change.content;
                pushToHistory(change.filePath, change.content);
            });
            setProjectFiles(newProjectFiles);
            
            const activeFileChange = result.fileChanges.find(c => c.filePath === activeFile);
            if (activeFileChange) {
                setEditorContent(activeFileChange.content);
            }

            setAiChatMessages(prev => [...prev, { role: 'model', content: result.summary }]);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to apply AI changes.';
            setError(errorMsg);
            setAiChatMessages(prev => [...prev, { role: 'model', content: `Sorry, an error occurred: ${errorMsg}` }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setEditorContent(newContent);
        if (activeFile) {
            setProjectFiles(prev => ({ ...prev!, [activeFile]: newContent }));
            if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
            debounceTimeoutRef.current = setTimeout(() => {
                pushToHistory(activeFile, newContent);
            }, 750);
        }
    };
    
    const handleUndo = useCallback(() => {
        if (!activeFile) return;
        setHistory(prev => {
            const fileHistory = prev[activeFile];
            if (fileHistory && fileHistory.pointer > 0) {
                const newPointer = fileHistory.pointer - 1;
                const newContent = fileHistory.stack[newPointer];
                setEditorContent(newContent);
                setProjectFiles(p => ({ ...p!, [activeFile]: newContent }));
                return { ...prev, [activeFile]: { ...fileHistory, pointer: newPointer } };
            }
            return prev;
        });
    }, [activeFile]);
    
    const handleRedo = useCallback(() => {
        if (!activeFile) return;
        setHistory(prev => {
            const fileHistory = prev[activeFile];
            if (fileHistory && fileHistory.pointer < fileHistory.stack.length - 1) {
                const newPointer = fileHistory.pointer + 1;
                const newContent = fileHistory.stack[newPointer];
                setEditorContent(newContent);
                setProjectFiles(p => ({ ...p!, [activeFile]: newContent }));
                return { ...prev, [activeFile]: { ...fileHistory, pointer: newPointer } };
            }
            return prev;
        });
    }, [activeFile]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey) {
                if (event.key === 'z') {
                    event.preventDefault();
                    if (event.shiftKey) {
                        handleRedo();
                    } else {
                        handleUndo();
                    }
                } else if (event.key === 'y') {
                    event.preventDefault();
                    handleRedo();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);

    const toggleFolder = (folderPath: string) => {
        setExpandedFolders(prev => ({ ...prev, [folderPath]: !prev[folderPath] }));
    };
    
    const handlePopOut = () => {
        if (previewSrcDoc) {
            const blob = new Blob([previewSrcDoc], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        }
    };

    const canUndo = activeFile && history[activeFile] && history[activeFile].pointer > 0;
    const canRedo = activeFile && history[activeFile] && history[activeFile].pointer < history[activeFile].stack.length - 1;

    const deviceDimensions = {
        desktop: { width: '100%', height: '100%' },
        tablet: { width: '768px', height: '1024px' },
        mobile: { width: '375px', height: '667px' },
    };

    if (!projectFiles && !isLoading) {
        return (
            <div className="flex justify-center items-center h-full animate-fadeIn">
                <Card className="max-w-xl w-full">
                    <h2 className="text-2xl font-bold mb-2 text-text-primary dark:text-dark-text-primary">Code Generator Studio</h2>
                    <p className="text-text-secondary dark:text-dark-text-secondary mb-6">Start a new project with AI, clone a repository, or open a local folder.</p>
                     
                    {/* Fix: Removed non-standard 'webkitdirectory' and 'directory' attributes from JSX to prevent TypeScript errors. */}
                    <input type="file" ref={fileInputRef} onChange={handleDirectorySelect} multiple style={{ display: 'none' }} />

                    <div className="flex space-x-1 bg-background dark:bg-dark-background p-1 rounded-lg border border-border-color dark:border-dark-border-color mb-4">
                        <button onClick={() => setInitialViewTab('prompt')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${initialViewTab === 'prompt' ? 'bg-primary text-white shadow' : 'hover:bg-gray-100'}`}>From Prompt</button>
                        <button onClick={() => setInitialViewTab('git')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${initialViewTab === 'git' ? 'bg-primary text-white shadow' : 'hover:bg-gray-100'}`}>From Git Repo</button>
                        <button onClick={() => setInitialViewTab('local')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${initialViewTab === 'local' ? 'bg-primary text-white shadow' : 'hover:bg-gray-100'}`}>
                            From Local
                        </button>
                    </div>

                    {initialViewTab === 'prompt' && <div className="space-y-4 animate-fadeIn">
                        <textarea value={initialPrompt} onChange={(e) => setInitialPrompt(e.target.value)} placeholder="e.g., A simple portfolio website..." className="w-full h-24 p-3 bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                        <button onClick={handleGenerateFromPrompt} disabled={!initialPrompt.trim()} className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex justify-center items-center">Create Project</button>
                    </div>}
                    {initialViewTab === 'git' && <div className="space-y-4 animate-fadeIn">
                        <input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/example/repo" className="w-full p-3 bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                        <button onClick={handleCloneFromRepo} disabled={!repoUrl.trim()} className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex justify-center items-center">Clone Repository</button>
                    </div>}
                    {initialViewTab === 'local' && <div className="text-center animate-fadeIn">
                        <p className="text-text-secondary dark:text-dark-text-secondary mb-4">Open a project from your local file system to start editing.</p>
                        <button onClick={handleOpenLocalProjectClick} className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover transition-colors flex justify-center items-center gap-2">{ICONS.openFolder} Open Project Folder</button>
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
                    <div className="flex items-center gap-2">
                        <button onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="p-1 rounded-md text-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-slate-700">{ICONS.undo}</button>
                        <button onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" className="p-1 rounded-md text-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-slate-700">{ICONS.redo}</button>
                        <span className="border-l border-border-color dark:border-dark-border-color h-5 mx-1"></span>
                        <span>{activeFile || 'Select a file to edit'}</span>
                    </div>
                </div>
                <div className="flex-grow relative">
                    <textarea value={editorContent} onChange={handleEditorChange} className="w-full h-full p-4 bg-background dark:bg-dark-background text-text-secondary dark:text-dark-text-secondary font-mono text-sm resize-none focus:outline-none" spellCheck="false" />
                </div>
            </main>

            {/* Right Panel: AI/Preview/Terminal */}
            <aside className="w-1/3 min-w-[400px] border-l border-border-color dark:border-dark-border-color flex flex-col bg-surface dark:bg-dark-surface">
                <div className="flex border-b border-border-color dark:border-dark-border-color">
                    <button onClick={() => setActiveRightTab('ai')} className={`flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-2 ${activeRightTab === 'ai' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-700'}`}>{ICONS.copilotMode} AI</button>
                    <button onClick={() => setActiveRightTab('preview')} className={`flex-1 py-2 text-sm font-semibold ${activeRightTab === 'preview' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-700'}`}>Preview</button>
                    <button onClick={() => setActiveRightTab('terminal')} className={`flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-2 ${activeRightTab === 'terminal' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-700'}`}>{ICONS.terminal} Terminal</button>
                    <button onClick={() => setActiveRightTab('git')} className={`flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-2 ${activeRightTab === 'git' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-700'}`}>{ICONS.git} Git</button>
                </div>
                <div className="flex-grow overflow-hidden">
                    {activeRightTab === 'ai' && (
                        <div className="flex flex-col h-full bg-background dark:bg-dark-background">
                            <div ref={aiChatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4">
                                {aiChatMessages.map((msg, index) => (
                                <div key={index} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'model' && <div className="w-7 h-7 mt-1 rounded-full flex items-center justify-center shrink-0 bg-gray-200 dark:bg-slate-600 text-sm font-bold">L</div>}
                                    <div className={`max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-surface dark:bg-dark-surface'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                </div>
                                ))}
                                {isLoading && aiChatMessages[aiChatMessages.length - 1]?.role === 'user' && (
                                    <div className="flex items-start gap-2.5 justify-start">
                                         <div className="w-7 h-7 mt-1 rounded-full flex items-center justify-center shrink-0 bg-gray-200 dark:bg-slate-600 text-sm font-bold">L</div>
                                        <div className="p-3 rounded-lg bg-surface dark:bg-dark-surface">
                                            <Spinner className="h-5 w-5 border-primary"/>
                                        </div>
                                    </div>
                                )}
                                 <div />
                            </div>
                            <div className="p-2 border-t border-border-color dark:border-dark-border-color bg-surface dark:bg-dark-surface">
                                <div className="flex items-center space-x-2">
                                <textarea 
                                    value={aiPrompt} 
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendAiMessage())}
                                    placeholder="Ask AI to make changes..."
                                    className="flex-grow p-2 bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none"
                                    rows={2}
                                    disabled={isLoading}
                                />
                                <button 
                                    onClick={handleSendAiMessage} 
                                    disabled={isLoading || !aiPrompt.trim()}
                                    className="bg-primary text-white p-2 rounded-lg hover:bg-primary-hover disabled:opacity-50 self-stretch"
                                >
                                    {ICONS.send}
                                </button>
                                </div>
                                {error && <p className="text-red-500 mt-1 text-xs px-1">{error}</p>}
                            </div>
                        </div>
                    )}
                    {activeRightTab === 'preview' && (
                        <div className="w-full h-full relative flex flex-col bg-gray-200 dark:bg-slate-800">
                            <div className="flex-shrink-0 bg-surface dark:bg-dark-surface p-1 border-b border-border-color dark:border-dark-border-color flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setDeviceMode('desktop')} title="Desktop View" className={`p-1.5 rounded-md ${deviceMode === 'desktop' ? 'bg-primary/10 text-primary' : 'text-secondary hover:bg-gray-100 dark:hover:bg-slate-700'}`}>{ICONS.desktop}</button>
                                    <button onClick={() => setDeviceMode('tablet')} title="Tablet View" className={`p-1.5 rounded-md ${deviceMode === 'tablet' ? 'bg-primary/10 text-primary' : 'text-secondary hover:bg-gray-100 dark:hover:bg-slate-700'}`}>{ICONS.tablet}</button>
                                    <button onClick={() => setDeviceMode('mobile')} title="Mobile View" className={`p-1.5 rounded-md ${deviceMode === 'mobile' ? 'bg-primary/10 text-primary' : 'text-secondary hover:bg-gray-100 dark:hover:bg-slate-700'}`}>{ICONS.mobile}</button>
                                </div>
                                <button onClick={handlePopOut} title="Open in new tab" className="p-1.5 rounded-md text-secondary hover:bg-gray-100 dark:hover:bg-slate-700">{ICONS.externalLink}</button>
                            </div>
                            <div className="flex-grow relative p-4 overflow-auto flex justify-center items-center">
                                {isPreviewBuilding && <div className="absolute inset-0 flex flex-col justify-center items-center bg-surface/80 z-10"><Spinner className="h-8 w-8 border-primary"/><p className="mt-2 text-sm">Building preview...</p></div>}
                                {previewError && <div className="absolute inset-0 flex flex-col justify-center items-center bg-red-50 p-4 text-center"><p className="font-semibold text-red-600">Preview Error</p><p className="text-xs text-red-500 mt-1 font-mono">{previewError}</p></div>}
                                <div
                                    className="shadow-lg transition-all duration-300 ease-in-out bg-white"
                                    style={{
                                        width: deviceDimensions[deviceMode].width,
                                        height: deviceDimensions[deviceMode].height,
                                        maxWidth: '100%',
                                        maxHeight: '100%'
                                    }}
                                >
                                    <iframe srcDoc={previewSrcDoc} title="Live Preview" sandbox="allow-scripts allow-same-origin" className={`w-full h-full border-2 border-gray-800 rounded-md transition-opacity ${isPreviewBuilding || previewError ? 'opacity-30' : 'opacity-100'}`} />
                                </div>
                            </div>
                        </div>
                    )}
                    {activeRightTab === 'terminal' && (
                        <div className="bg-gray-900 text-white font-mono text-xs p-2 h-full overflow-y-auto flex flex-col-reverse">
                             <div className="flex-shrink-0">
                                {consoleMessages.slice().reverse().map((msg, i) => (
                                    <div key={i} className={`flex items-start whitespace-pre-wrap border-b border-gray-700/50 py-1 ${
                                        msg.type === 'error' ? 'text-red-400' : 
                                        msg.type === 'warn' ? 'text-yellow-400' : 
                                        msg.type === 'system' ? 'text-blue-400' : 'text-gray-300'
                                    }`}>
                                        <span className="mr-2 select-none">{'>'}</span>
                                        <div className="flex-grow">
                                            {msg.data.map((arg, j) => {
                                                try {
                                                    return <span key={j}>{typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)} </span>
                                                } catch {
                                                    return <span key={j}>[unserializable object] </span>
                                                }
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                     {activeRightTab === 'git' && (
                        <div className="space-y-4 p-4">
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