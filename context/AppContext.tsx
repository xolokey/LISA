

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Language, UserPreferences, Persona, Reminder, TodoItem, CalendarEvent, GoogleUser, ChatSession, ChatMessage, Theme } from '../types';
import { generateChatResponse, getGreeting, analyzeSentiment, generateChatTitle } from '../services/geminiService';

interface AppContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  isVoiceOutputEnabled: boolean;
  toggleVoiceOutput: () => void;
  preferences: UserPreferences;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  reminders: Reminder[];
  addReminder: (reminder: Omit<Reminder, 'id'>) => void;
  removeReminder: (id: string) => void;
  todos: TodoItem[];
  addTodo: (todo: Omit<TodoItem, 'id' | 'completed'>) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  calendarEvents: CalendarEvent[];
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  removeCalendarEvent: (id: string) => void;
  agendaHistory: CalendarEvent[];
  user: GoogleUser | null;
  signIn: () => void;
  signOut: () => void;
  // New Session Management
  sessions: ChatSession[];
  activeSessionId: string | null;
  activeSession: ChatSession | null;
  createNewChat: () => void;
  setActiveSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  sendMessage: (prompt: string, file?: File) => Promise<void>;
  isSendingMessage: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialEvents: CalendarEvent[] = [
    { id: '1', title: 'Project Stand-up', time: '10:00 AM' },
    { id: '2', title: 'Design Review', time: '01:00 PM', attendees: ['Alex', 'Sam'] },
    { id: '3', title: 'Client Call', time: '03:30 PM' },
];

const today = new Date();
const currentDay = today.getDate();
const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, currentDay);
const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, currentDay);

const initialHistory: CalendarEvent[] = [
    { id: 'h1', title: 'Monthly Review', time: '10:00 AM', date: lastMonth.toISOString().split('T')[0] },
    { id: 'h2', title: 'Performance Sync', time: '02:00 PM', attendees: ['Alex'], date: lastMonth.toISOString().split('T')[0] },
    { id: 'h3', title: 'Q2 Planning Session', time: '09:00 AM', date: twoMonthsAgo.toISOString().split('T')[0] },
    { id: 'h4', title: 'Marketing Brainstorm', time: '11:30 AM', date: twoMonthsAgo.toISOString().split('T')[0] },
];

const mockUser: GoogleUser = {
    name: 'Alex Doe',
    email: 'alex.doe@example.com',
    picture: `https://i.pravatar.cc/150?u=alexdoe`,
};

const defaultPreferences: UserPreferences = {
  persona: 'Neutral',
  theme: 'system',
};

const errorTranslations = {
    [Language.ENGLISH]: {
        quota: "I've reached my daily request limit for this model. Please try again tomorrow.",
        generic: "Sorry, I couldn't process that. Please try again."
    },
    [Language.TAMIL]: {
        quota: "இந்த மாடலுக்கான எனது தினசரி கோரிக்கை வரம்பை நான் அடைந்துவிட்டேன். தயவுசெய்து நாளை மீண்டும் முயற்சிக்கவும்.",
        generic: "மன்னிக்கவும், அதைச் செயல்படுத்த முடியவில்லை. தயவுசெய்து மீண்டும் முயற்சிக்கவும்."
    },
    [Language.HINDI]: {
        quota: "मैंने इस मॉडल के लिए अपनी दैनिक अनुरोध सीमा पूरी कर ली है। कृपया कल पुनः प्रयास करें।",
        generic: "क्षमा करें, मैं उसे संसाधित नहीं कर सका। कृपया पुनः प्रयास करें।"
    },
    [Language.SPANISH]: {
        quota: "He alcanzado mi límite diario de solicitudes para este modelo. Por favor, inténtalo de nuevo mañana.",
        generic: "Lo siento, no pude procesar eso. Por favor, inténtalo de nuevo."
    },
    [Language.FRENCH]: {
        quota: "J'ai atteint ma limite quotidienne de requêtes pour ce modèle. Veuillez réessayer demain.",
        generic: "Désolé, je n'ai pas pu traiter cela. Veuillez réessayer."
    },
    [Language.GERMAN]: {
        quota: "Ich habe mein tägliches Anfragelimit für dieses Modell erreicht. Bitte versuchen Sie es morgen erneut.",
        generic: "Entschuldigung, ich konnte das nicht verarbeiten. Bitte versuchen Sie es erneut."
    },
    [Language.JAPANESE]: {
        quota: "このモデルの1日のリクエスト上限に達しました。明日もう一度お試しください。",
        generic: "申し訳ありませんが、処理できませんでした。もう一度お試しください。"
    },
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(false);
  const [preferences, setCorePreferences] = useState<UserPreferences>(defaultPreferences);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([
      { id: 't1', item: 'Finalize Q3 report', completed: false },
      { id: 't2', item: 'Submit expense claims', completed: true },
  ]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initialEvents);
  const [agendaHistory] = useState<CalendarEvent[]>(initialHistory);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const voiceEnabledRef = React.useRef(isVoiceOutputEnabled);
  useEffect(() => { voiceEnabledRef.current = isVoiceOutputEnabled; }, [isVoiceOutputEnabled]);
  
  // --- Theme Management ---
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      preferences.theme === 'dark' ||
      (preferences.theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.toggle('dark', isDark);
  }, [preferences.theme]);

  useEffect(() => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
          if (preferences.theme === 'system') {
              const root = window.document.documentElement;
              root.classList.toggle('dark', mediaQuery.matches);
          }
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
  }, [preferences.theme]);


  // --- Persistence ---
  useEffect(() => {
    try {
      const storedSessions = localStorage.getItem('chatSessions');
      if (storedSessions) setSessions(JSON.parse(storedSessions));
      
      const storedActiveId = localStorage.getItem('activeChatSessionId');
      if (storedActiveId) setActiveSessionId(storedActiveId);

      const storedPrefs = localStorage.getItem('userPreferences');
      if (storedPrefs) setCorePreferences(JSON.parse(storedPrefs));

    } catch (error) {
      console.error("Failed to load from local storage:", error);
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) localStorage.setItem('chatSessions', JSON.stringify(sessions));
    if (activeSessionId) localStorage.setItem('activeChatSessionId', activeSessionId);
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
  }, [sessions, activeSessionId, preferences]);

  const setPreferences = (newPrefs: Partial<UserPreferences>) => {
    setCorePreferences(prev => ({ ...prev, ...newPrefs }));
  };

  const createNewChat = useCallback(async () => {
    setIsSendingMessage(true);
    try {
        const greetingText = await getGreeting(language, preferences.persona);
        if (voiceEnabledRef.current) {
          speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(greetingText);
          utterance.lang = language;
          speechSynthesis.speak(utterance);
        }
        const newSession: ChatSession = {
            id: new Date().toISOString(),
            title: "New Chat",
            messages: [{ role: 'model', content: greetingText }],
            createdAt: Date.now(),
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
    } catch (error) {
        console.error("Failed to create new chat:", error);
    } finally {
        setIsSendingMessage(false);
    }
  }, [language, preferences.persona]);
  
  useEffect(() => {
      const storedSessions = localStorage.getItem('chatSessions');
      if (!storedSessions || JSON.parse(storedSessions).length === 0) {
          createNewChat();
      }
  }, [createNewChat]);


  const setActiveSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const newSessions = prev.filter(s => s.id !== sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(newSessions[0]?.id || null);
      }
      if (newSessions.length === 0) {
        localStorage.removeItem('chatSessions');
        createNewChat(); 
      }
      return newSessions;
    });
  }, [activeSessionId, createNewChat]);

  const sendMessage = useCallback(async (prompt: string, file?: File) => {
    if (!activeSessionId) return;

    setIsSendingMessage(true);

    const userMessage: ChatMessage = {
      role: 'user',
      content: prompt,
      ...(file && { fileInfo: { name: file.name, type: file.type } })
    };
    
    try { userMessage.sentiment = await analyzeSentiment(prompt); } catch (e) { console.error(e) }

    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, userMessage] } : s));
    
    const isNewChat = sessions.find(s => s.id === activeSessionId)?.messages.filter(m => m.role === 'user').length === 1;
    if (isNewChat) {
      generateChatTitle(prompt).then(title => {
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title } : s));
      });
    }

    try {
      const currentSession = sessions.find(s => s.id === activeSessionId);
      const history = currentSession?.messages.filter(m => typeof m.content === 'string').map(m => ({ role: m.role, parts: [{ text: m.content }] })) ?? [];

      const response = await generateChatResponse(history, prompt, language, preferences.persona, !!user, file);

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

      if (voiceEnabledRef.current && response.content) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(response.content);
        utterance.lang = language;
        speechSynthesis.speak(utterance);
      }

      const modelMessage: ChatMessage = { role: 'model', ...response, content: response.content ?? '' };
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, modelMessage] } : s));

    } catch (error) {
      console.error("Error sending message:", error);
      
      const t = errorTranslations[language] || errorTranslations[Language.ENGLISH];
      let errorMessageText = t.generic;

      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        errorMessageText = t.quota;
      }

      if (voiceEnabledRef.current) {
        const utterance = new SpeechSynthesisUtterance(errorMessageText);
        utterance.lang = language;
        speechSynthesis.speak(utterance);
      }
      const errorModelMessage: ChatMessage = { role: 'model', content: errorMessageText };
       setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, errorModelMessage] } : s));
    } finally {
      setIsSendingMessage(false);
    }

  }, [activeSessionId, sessions, language, preferences.persona, user]);

  const activeSession = sessions.find(s => s.id === activeSessionId) ?? null;

  const signIn = useCallback(() => setUser(mockUser), []);
  const signOut = useCallback(() => setUser(null), []);

  const toggleVoiceOutput = () => {
    setIsVoiceOutputEnabled(prev => {
      if (prev) { 
        speechSynthesis.cancel();
      }
      return !prev;
    });
  };
  
  const addReminder = useCallback((reminder: Omit<Reminder, 'id'>) => {
    setReminders(prev => [...prev, { ...reminder, id: new Date().toISOString() }]);
  }, []);
  
  const removeReminder = useCallback((id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  }, []);

  const addTodo = useCallback((todo: Omit<TodoItem, 'id' | 'completed'>) => {
      setTodos(prev => [...prev, { ...todo, id: new Date().toISOString(), completed: false }]);
  }, []);

  const toggleTodo = useCallback((id: string) => {
      setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }, []);

  const removeTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  }, []);

  const addCalendarEvent = useCallback((event: Omit<CalendarEvent, 'id'>) => {
    setCalendarEvents(prev => [...prev, { ...event, id: new Date().toISOString() }].sort((a,b) => a.time.localeCompare(b.time)));
  }, []);

  const removeCalendarEvent = useCallback((id: string) => {
    setCalendarEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  return (
    <AppContext.Provider value={{ 
        language, setLanguage, 
        isVoiceOutputEnabled, toggleVoiceOutput,
        preferences, setPreferences,
        reminders, addReminder, removeReminder,
        todos, addTodo, toggleTodo, removeTodo,
        calendarEvents, addCalendarEvent, removeCalendarEvent,
        agendaHistory,
        user, signIn, signOut,
        sessions, activeSessionId, activeSession,
        createNewChat, setActiveSession, deleteSession,
        sendMessage, isSendingMessage,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
