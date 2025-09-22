
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { Language, UserPreferences, Persona, Reminder, TodoItem, CalendarEvent } from '../types';

interface AppContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  isVoiceOutputEnabled: boolean;
  toggleVoiceOutput: () => void;
  preferences: UserPreferences;
  setPreferences: (prefs: UserPreferences) => void;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialEvents: CalendarEvent[] = [
    { id: '1', title: 'Project Stand-up', time: '10:00 AM' },
    { id: '2', title: 'Design Review', time: '01:00 PM', attendees: ['Alex', 'Sam'] },
    { id: '3', title: 'Client Call', time: '03:30 PM' },
];

// Create some mock history data for the same day in previous months
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


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);
  const [preferences, setPreferences] = useState<UserPreferences>({ persona: 'Neutral' });
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([
      { id: 't1', item: 'Finalize Q3 report', completed: false },
      { id: 't2', item: 'Submit expense claims', completed: true },
  ]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initialEvents);
  const [agendaHistory] = useState<CalendarEvent[]>(initialHistory);


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