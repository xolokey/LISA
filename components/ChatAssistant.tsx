

import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useSpeech } from '../hooks/useSpeech';
import Spinner from './common/Spinner';
import { ICONS } from '../constants';
import { Language } from '../types';
import ChatMessage from './ChatMessage';
import SuggestionChip from './common/SuggestionChip';

const translations = {
    [Language.ENGLISH]: { placeholder: "Ask Lisa anything or drop a file...", googleSearch: "Google Search" },
    [Language.TAMIL]: { placeholder: "லிசாவிடம் எதையும் கேளுங்கள் அல்லது ஒரு கோப்பை விடுங்கள்...", googleSearch: "கூகிள் தேடல்" },
    [Language.HINDI]: { placeholder: "लिसा से कुछ भी पूछें या कोई फ़ाइल छोड़ें...", googleSearch: "गूगल खोज" },
    [Language.SPANISH]: { placeholder: "Pregúntale a Lisa cualquier cosa o suelta un archivo...", googleSearch: "Búsqueda de Google" },
    [Language.FRENCH]: { placeholder: "Demandez n'importe quoi à Lisa ou déposez un fichier...", googleSearch: "Recherche Google" },
    [Language.GERMAN]: { placeholder: "Fragen Sie Lisa alles oder legen Sie eine Datei ab...", googleSearch: "Google Suche" },
    [Language.JAPANESE]: { placeholder: "リサに何でも質問するか、ファイルをドロップしてください...", googleSearch: "Google検索" },
};

const ChatAssistant: React.FC = () => {
  const { 
    language, user, activeSession, sendMessage, isSendingMessage,
    isVoiceOutputEnabled, toggleVoiceOutput, chatInput, setChatInput,
  } = useAppContext();
  
  const t = translations[language];
  const { transcript, isListening, startListening, stopListening, hasRecognitionSupport } = useSpeech(language);
  
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<{ name: string; type: string; } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [useGoogleSearch, setUseGoogleSearch] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (chatInput) {
      setInput(chatInput);
      setChatInput(''); 
    }
  }, [chatInput, setChatInput]);

  const messages = activeSession?.messages ?? [];
  const isGreetingLoading = !activeSession && !isSendingMessage;
  const showSuggestions = messages.length <= 1 && !isSendingMessage;

  useEffect(() => { setInput(transcript); }, [transcript]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isSendingMessage]);

  const processFile = (file: File) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'text/plain', 'text/markdown', 'text/html', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert(`File type ${file.type} is not supported. Please use one of: ${allowedTypes.join(', ')}`);
      return;
    }
    setAttachedFile(file);
    setAttachmentPreview({ name: file.name, type: file.type });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };
  
  const handleDragEvents = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragOver(true);
    else if (e.type === 'dragleave' || e.type === 'drop') setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    handleDragEvents(e);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    setAttachmentPreview(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (prompt?: string) => {
    const currentInput = prompt || input;
    if ((!currentInput.trim() && !attachedFile) || isSendingMessage) return;

    setInput('');
    clearAttachment();
    await sendMessage(currentInput, attachedFile ?? undefined, useGoogleSearch);
  };
  
  const suggestions = [
      "Schedule a meeting with the team for 3pm", 
      "Add 'Deploy feature' to my todo list", 
      "Mark 'Finalize Q3 report' as done",
      "Remind me to call John at 5pm"
  ];

  return (
    <div 
      className="flex flex-col h-full relative"
      onDragEnter={handleDragEvents}
      onDragOver={handleDragEvents}
      onDragLeave={handleDragEvents}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 bg-surface/80 dark:bg-dark-surface/80 backdrop-blur-sm flex flex-col justify-center items-center z-20 border-2 border-dashed border-primary dark:border-dark-primary rounded-lg">
          <div className="text-primary dark:text-dark-primary mb-4">{ICONS.upload}</div>
          <p className="text-text-primary dark:text-dark-text-primary font-semibold">Drop file to attach</p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-6 p-4">
        {isGreetingLoading ? ( <div className="flex justify-start"><div className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-dark-surface"><Spinner /></div></div> ) : 
        ( messages.map((msg, index) => <ChatMessage key={`${activeSession?.id}-${index}`} message={msg} onSendMessage={handleSendMessage} user={user} />) )}
        {isSendingMessage && messages[messages.length - 1]?.role === 'user' && ( <div className="flex justify-start"><div className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-dark-surface"><Spinner /></div></div> )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 w-full max-w-4xl mx-auto">
        {showSuggestions && (
            <div className="flex flex-wrap gap-2 justify-center mb-4 animate-fadeIn">
                {suggestions.map(s => <SuggestionChip key={s} text={s} onClick={() => handleSendMessage(s)} />)}
            </div>
        )}
        <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-card dark:shadow-dark-card border border-border-color dark:border-dark-border-color p-2">
            <div className="flex items-start">
                <textarea
                    value={input} onChange={(e) => setInput(e.target.value)} 
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    placeholder={t.placeholder}
                    className="flex-1 bg-transparent p-3 focus:outline-none text-text-primary dark:text-dark-text-primary placeholder:text-secondary dark:placeholder:text-dark-secondary resize-none h-14"
                    rows={1}
                    disabled={isSendingMessage || isGreetingLoading}
                />
                <button
                    onClick={() => handleSendMessage()} disabled={(!input.trim() && !attachedFile) || isSendingMessage || isGreetingLoading}
                    title="Send message" aria-label="Send message"
                    className="p-2 m-1 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-all"
                 >
                    {ICONS.send}
                 </button>
            </div>
            {attachmentPreview && (
              <div className="ml-12 mb-2 px-2 py-1 bg-gray-100 dark:bg-slate-700 border border-border-color dark:border-dark-border-color rounded-md text-sm flex items-center gap-2 w-fit">
                {ICONS.attach}
                <span className="text-text-secondary dark:text-dark-text-secondary">{attachmentPreview.name}</span>
                <button onClick={clearAttachment} className="text-secondary dark:text-dark-secondary hover:text-text-primary dark:hover:text-dark-text-primary">{ICONS.close}</button>
              </div>
            )}
            <div className="flex items-center justify-between pl-2">
                <div className="flex items-center gap-1 bg-background dark:bg-dark-background rounded-lg p-1">
                    <button onClick={() => setUseGoogleSearch(prev => !prev)} className={`p-1.5 rounded-md transition-colors text-sm flex items-center gap-1.5 ${useGoogleSearch ? 'bg-primary text-white' : 'text-secondary dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-slate-700'}`} title={t.googleSearch}>
                      {ICONS.google} {t.googleSearch}
                    </button>
                </div>
                <div className="flex items-center gap-2 text-secondary dark:text-dark-secondary">
                    <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden"/>
                    <button onClick={() => fileInputRef.current?.click()} title="Attach file" className="p-2 hover:text-primary dark:hover:text-dark-primary transition-colors">{ICONS.attach}</button>
                    <button onClick={toggleVoiceOutput} title={isVoiceOutputEnabled ? 'Mute voice' : 'Enable voice'} className="p-2 hover:text-primary dark:hover:text-dark-primary transition-colors">
                        {isVoiceOutputEnabled ? ICONS.speaker : ICONS.speakerOff}
                    </button>
                    {hasRecognitionSupport && (
                        <button onClick={() => isListening ? stopListening() : startListening()} title={isListening ? 'Stop listening' : 'Start listening'}
                            className={`p-2 transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'hover:text-primary dark:hover:text-dark-primary'}`}
                        >
                            {isListening ? ICONS.stop : ICONS.microphone}
                        </button>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
