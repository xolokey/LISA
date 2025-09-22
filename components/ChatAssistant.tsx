
import React, { useState, useEffect, useRef } from 'react';
import { generateChatResponse, analyzeSentiment, getGreeting } from '../services/geminiService';
import { useAppContext } from '../context/AppContext';
import { useSpeech } from '../hooks/useSpeech';
import Spinner from './common/Spinner';
import { ICONS } from '../constants';
import { ChatMessage as ChatMessageType, Language, Sentiment } from '../types';
import ChatMessage from './ChatMessage';
import SuggestionChip from './common/SuggestionChip';

const translations = {
    [Language.ENGLISH]: { placeholder: "Research anything or ask Lisa a question..." },
    [Language.TAMIL]: { placeholder: "எதையும் ஆராயுங்கள் அல்லது லிசாவிடம் ஒரு கேள்வியைக் கேளுங்கள்..." },
    [Language.HINDI]: { placeholder: "कुछ भी शोध करें या लिसा से कोई प्रश्न पूछें..." },
    [Language.SPANISH]: { placeholder: "Investiga cualquier cosa o hazle una pregunta a Lisa..." },
    [Language.FRENCH]: { placeholder: "Recherchez n'importe quoi ou posez une question à Lisa..." },
    [Language.GERMAN]: { placeholder: "Recherchieren Sie alles oder stellen Sie Lisa eine Frage..." },
    [Language.JAPANESE]: { placeholder: "何かを調べるか、リサに質問してください..." },
};

const ChatAssistant: React.FC = () => {
  const { 
    language, preferences, isVoiceOutputEnabled, toggleVoiceOutput, 
    reminders, addReminder, removeReminder,
    todos, addTodo, toggleTodo, removeTodo, 
    addCalendarEvent 
  } = useAppContext();
  const t = translations[language];
  const { transcript, isListening, startListening, stopListening, speak, hasRecognitionSupport } = useSpeech(language);
  
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<{ name: string; type: string; } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGreetingLoading, setIsGreetingLoading] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeMode, setActiveMode] = useState('search');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceEnabledRef = useRef(isVoiceOutputEnabled);
  
  useEffect(() => { voiceEnabledRef.current = isVoiceOutputEnabled; }, [isVoiceOutputEnabled]);

  useEffect(() => {
    const fetchGreeting = async () => {
        setIsGreetingLoading(true);
        setMessages([]); 
        try {
            const greetingText = await getGreeting(language, preferences.persona);
            setMessages([{ role: 'model', content: greetingText }]);
            if (voiceEnabledRef.current) speak(greetingText);
        } catch (error) {
            console.error("Error fetching greeting:", error);
            const fallbackGreeting = "Hello! How can I help you today?";
            setMessages([{ role: 'model', content: fallbackGreeting }]);
            if (voiceEnabledRef.current) speak(fallbackGreeting);
        } finally {
            setIsGreetingLoading(false);
        }
    };
    fetchGreeting();
  }, [language, preferences.persona, speak]);

  useEffect(() => { setInput(transcript); }, [transcript]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  const processFile = (file: File) => {
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
    if ((!currentInput.trim() && !attachedFile) || isLoading) return;

    let sentiment: Sentiment | undefined;
    if (currentInput.trim()) {
      try { sentiment = await analyzeSentiment(currentInput); } catch (error) { console.error("Failed to analyze sentiment:", error); }
    }

    const userMessage: ChatMessageType = { 
      role: 'user', 
      content: currentInput,
      sentiment,
      ...(attachmentPreview && { fileInfo: { name: attachmentPreview.name, type: attachmentPreview.type }})
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    clearAttachment();
    setIsLoading(true);

    try {
      const history = messages.filter(msg => typeof msg.content === 'string').map(msg => ({ role: msg.role, parts: [{ text: msg.content as string }] }));
      const response = await generateChatResponse(history, currentInput, language, preferences.persona, attachedFile ?? undefined);
      
      // Handle tool-call side effects
      if (response.reminder) addReminder(response.reminder);
      if (response.todo) addTodo(response.todo);
      if (response.calendarEvent) addCalendarEvent(response.calendarEvent);
      if (response.todoToggled) {
          const todoToToggle = todos.find(t => t.item.toLowerCase() === (response.todoToggled?.item ?? '').toLowerCase());
          if (todoToToggle) toggleTodo(todoToToggle.id);
      }
      if (response.todoRemoved) {
          const todoToRemove = todos.find(t => t.item.toLowerCase() === (response.todoRemoved?.item ?? '').toLowerCase());
          if (todoToRemove) removeTodo(todoToRemove.id);
      }
      if (response.reminderRemoved) {
          const reminderToRemove = reminders.find(r => r.task.toLowerCase() === (response.reminderRemoved?.task ?? '').toLowerCase());
          if (reminderToRemove) removeReminder(reminderToRemove.id);
      }

      if (voiceEnabledRef.current && response.content) speak(response.content);
      const modelMessage: ChatMessageType = { role: 'model', ...response, content: response.content ?? '' };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessageText = "Sorry, I couldn't process that. Please try again.";
      if (voiceEnabledRef.current) speak(errorMessageText);
      setMessages(prev => [...prev, { role: 'model', content: errorMessageText }]);
    } finally {
      setIsLoading(false);
    }
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
        <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm flex flex-col justify-center items-center z-20 border-2 border-dashed border-primary rounded-lg">
          <div className="text-primary mb-4">{ICONS.upload}</div>
          <p className="text-text-primary font-semibold">Drop file to attach</p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-6 p-4">
        {isGreetingLoading ? ( <div className="flex justify-start"><div className="px-4 py-2 rounded-lg bg-gray-100"><Spinner /></div></div> ) : 
        ( messages.map((msg, index) => <ChatMessage key={index} message={msg} onSendMessage={handleSendMessage} />) )}
        {isLoading && ( <div className="flex justify-start"><div className="px-4 py-2 rounded-lg bg-gray-100"><Spinner /></div></div> )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 w-full max-w-4xl mx-auto">
        {!isGreetingLoading && messages.length <= 1 && !isLoading && (
            <div className="flex flex-wrap gap-2 justify-center mb-4 animate-fadeIn">
                {suggestions.map(s => <SuggestionChip key={s} text={s} onClick={() => handleSendMessage(s)} />)}
            </div>
        )}
        <div className="bg-surface rounded-2xl shadow-card border border-border-color p-2">
            <div className="flex items-start">
                <textarea
                    value={input} onChange={(e) => setInput(e.target.value)} 
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    placeholder={t.placeholder}
                    className="flex-1 bg-transparent p-3 focus:outline-none text-text-primary placeholder:text-secondary resize-none h-14"
                    rows={1}
                    disabled={isLoading || isGreetingLoading}
                />
                <button
                    onClick={() => handleSendMessage()} disabled={(!input.trim() && !attachedFile) || isLoading || isGreetingLoading}
                    title="Send message" aria-label="Send message"
                    className="p-2 m-1 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                 >
                    {ICONS.send}
                 </button>
            </div>
            {attachmentPreview && (
              <div className="ml-12 mb-2 px-2 py-1 bg-gray-100 border border-border-color rounded-md text-sm flex items-center gap-2 w-fit">
                {ICONS.attach}
                <span className="text-text-secondary">{attachmentPreview.name}</span>
                <button onClick={clearAttachment} className="text-secondary hover:text-text-primary">{ICONS.close}</button>
              </div>
            )}
            <div className="flex items-center justify-between pl-2">
                <div className="flex items-center gap-1 bg-background rounded-lg p-1">
                    <button onClick={() => setActiveMode('search')} className={`p-1.5 rounded-md transition-colors ${activeMode === 'search' ? 'bg-primary text-white' : 'text-secondary hover:bg-gray-200'}`} title="Search Mode">{ICONS.searchMode}</button>
                    <button onClick={() => setActiveMode('copilot')} className={`p-1.5 rounded-md transition-colors ${activeMode === 'copilot' ? 'bg-primary text-white' : 'text-secondary hover:bg-gray-200'}`} title="Copilot Mode">{ICONS.copilotMode}</button>
                    <button onClick={() => setActiveMode('focus')} className={`p-1.5 rounded-md transition-colors ${activeMode === 'focus' ? 'bg-primary text-white' : 'text-secondary hover:bg-gray-200'}`} title="Focus Mode">{ICONS.focusMode}</button>
                </div>
                <div className="flex items-center gap-2 text-secondary">
                    <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden"/>
                    <button onClick={() => fileInputRef.current?.click()} title="Attach file" className="p-2 hover:text-primary transition-colors">{ICONS.attach}</button>
                    <button onClick={toggleVoiceOutput} title={isVoiceOutputEnabled ? 'Mute voice' : 'Enable voice'} className="p-2 hover:text-primary transition-colors">
                        {isVoiceOutputEnabled ? ICONS.speakerOff : ICONS.speaker}
                    </button>
                    {hasRecognitionSupport && (
                        <button onClick={() => isListening ? stopListening() : startListening()} title={isListening ? 'Stop listening' : 'Start listening'}
                            className={`p-2 transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'hover:text-primary'}`}
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