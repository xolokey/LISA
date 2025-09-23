
import React, { useState } from 'react';
import Card from './common/Card';
import Spinner from './common/Spinner';
import { useAppContext } from '../context/AppContext';
import { Language } from '../types';
import { ICONS } from '../constants';
import { generateImage, editImage } from '../services/geminiService';

const translations = {
    [Language.ENGLISH]: {
        title: "Image Studio",
        description: "Generate new images from text descriptions or upload your own to edit with AI.",
        generateTab: "Generate",
        editTab: "Edit",
        generatePrompt: "Describe the image you want to create...",
        generateButton: "Generate Image",
        aspectRatio: "Aspect Ratio",
        editPrompt: "Describe the edit you want to make...",
        editButton: "Edit Image",
        uploadPrompt: "Click to upload or drag & drop an image",
        uploading: "Uploading...",
        generating: "Generating...",
        editing: "Editing...",
        download: "Download",
        error: "An error occurred. Please try again.",
    },
    // Add other languages as needed
};

const ImageStudio: React.FC = () => {
    const { language } = useAppContext();
    const t = translations[language] || translations[Language.ENGLISH];
    
    const [activeTab, setActiveTab] = useState<'generate' | 'edit'>('generate');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Generate state
    const [generatePrompt, setGeneratePrompt] = useState('A photorealistic image of a futuristic city skyline at sunset, with flying cars.');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    
    // Edit state
    const [editPrompt, setEditPrompt] = useState('Add a small, friendly robot waving from a balcony.');
    const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
    const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
    const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleGenerate = async () => {
        if (!generatePrompt.trim()) return;
        setIsLoading(true);
        setError('');
        setGeneratedImageUrl(null);
        try {
            const imageUrl = await generateImage(generatePrompt, aspectRatio);
            setGeneratedImageUrl(imageUrl);
        } catch (e) {
            console.error(e);
            setError(t.error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleEdit = async () => {
        if (!editPrompt.trim() || !originalImageFile) return;
        setIsLoading(true);
        setError('');
        setEditedImageUrl(null);
        try {
            const { imageUrl } = await editImage(editPrompt, originalImageFile);
            if (imageUrl) setEditedImageUrl(imageUrl);
        } catch (e) {
            console.error(e);
            setError(t.error);
        } finally {
            setIsLoading(false);
        }
    };

    const processFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setOriginalImageFile(file);
        setOriginalImageUrl(URL.createObjectURL(file));
        setEditedImageUrl(null);
        setError('');
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) processFile(e.target.files[0]);
    };

    const handleDragEvents = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setIsDragOver(true);
        else if (e.type === 'dragleave' || e.type === 'drop') setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        handleDragEvents(e);
        if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
    };

    return (
        <div className="max-w-6xl mx-auto">
            <Card>
                <h2 className="text-2xl font-bold mb-2 text-text-primary dark:text-dark-text-primary">{t.title}</h2>
                <p className="text-text-secondary dark:text-dark-text-secondary mb-6">{t.description}</p>
                
                <div className="flex space-x-2 bg-background dark:bg-dark-background p-1 rounded-lg border border-border-color dark:border-dark-border-color mb-6 w-fit">
                    <button onClick={() => setActiveTab('generate')} className={`py-2 px-4 rounded-md transition-all text-sm font-semibold ${activeTab === 'generate' ? 'bg-primary text-white shadow' : 'text-text-secondary dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-slate-700'}`}>{t.generateTab}</button>
                    <button onClick={() => setActiveTab('edit')} className={`py-2 px-4 rounded-md transition-all text-sm font-semibold ${activeTab === 'edit' ? 'bg-primary text-white shadow' : 'text-text-secondary dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-slate-700'}`}>{t.editTab}</button>
                </div>

                {activeTab === 'generate' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                        <div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-2">{t.generatePrompt}</label>
                                    <textarea value={generatePrompt} onChange={(e) => setGeneratePrompt(e.target.value)} rows={4} className="w-full p-3 bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-2">{t.aspectRatio}</label>
                                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full p-3 bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none">
                                        <option value="1:1">Square (1:1)</option>
                                        <option value="16:9">Widescreen (16:9)</option>
                                        <option value="9:16">Portrait (9:16)</option>
                                        <option value="4:3">Landscape (4:3)</option>
                                        <option value="3:4">Portrait (3:4)</option>
                                    </select>
                                </div>
                                <button onClick={handleGenerate} disabled={isLoading} className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover transition-colors disabled:bg-gray-400 dark:disabled:bg-slate-600 flex justify-center items-center">
                                    {isLoading ? <><Spinner className="h-6 w-6 border-white mr-2"/> {t.generating}</> : t.generateButton}
                                </button>
                            </div>
                        </div>
                        <div className="bg-background dark:bg-dark-background rounded-lg border border-border-color dark:border-dark-border-color flex items-center justify-center p-4 min-h-[300px] relative">
                            {isLoading && <Spinner className="h-12 w-12 border-primary" />}
                            {generatedImageUrl && !isLoading && (
                                <>
                                    <img src={generatedImageUrl} alt="Generated" className="max-h-full max-w-full rounded-md object-contain"/>
                                    <a href={generatedImageUrl} download="generated-image.jpg" className="absolute bottom-4 right-4 bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary px-3 py-1.5 rounded-full text-sm shadow-md hover:shadow-lg transition-shadow border border-border-color dark:border-dark-border-color">{t.download}</a>
                                </>
                            )}
                        </div>
                    </div>
                )}
                
                {activeTab === 'edit' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                        <div>
                             <div className="space-y-4">
                                 <div onDragEnter={handleDragEvents} onDragOver={handleDragEvents} onDragLeave={handleDragEvents} onDrop={handleDrop}>
                                     <label htmlFor="image-upload" className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragOver ? 'border-primary bg-teal-50 dark:bg-teal-500/10' : 'border-border-color dark:border-dark-border-color hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
                                         {originalImageUrl ? (
                                             <img src={originalImageUrl} alt="Original" className="max-h-full max-w-full rounded-md object-contain" />
                                         ) : (
                                             <div className="text-center">
                                                 <div className="text-primary dark:text-dark-primary mb-2">{ICONS.upload}</div>
                                                 <p className="text-text-primary dark:text-dark-text-primary font-semibold">{t.uploadPrompt}</p>
                                             </div>
                                         )}
                                     </label>
                                     <input id="image-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-2">{t.editPrompt}</label>
                                     <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} rows={3} className="w-full p-3 bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                                 </div>
                                 <button onClick={handleEdit} disabled={isLoading || !originalImageFile} className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover transition-colors disabled:bg-gray-400 dark:disabled:bg-slate-600 flex justify-center items-center">
                                     {isLoading ? <><Spinner className="h-6 w-6 border-white mr-2"/> {t.editing}</> : t.editButton}
                                 </button>
                             </div>
                        </div>
                         <div className="bg-background dark:bg-dark-background rounded-lg border border-border-color dark:border-dark-border-color flex items-center justify-center p-4 min-h-[300px] relative">
                             {isLoading && <Spinner className="h-12 w-12 border-primary" />}
                             {editedImageUrl && !isLoading && (
                                <>
                                    <img src={editedImageUrl} alt="Edited" className="max-h-full max-w-full rounded-md object-contain"/>
                                     <a href={editedImageUrl} download="edited-image.png" className="absolute bottom-4 right-4 bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary px-3 py-1.5 rounded-full text-sm shadow-md hover:shadow-lg transition-shadow border border-border-color dark:border-dark-border-color">{t.download}</a>
                                </>
                             )}
                         </div>
                     </div>
                )}
                {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
            </Card>
        </div>
    );
};

export default ImageStudio;
