import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatSession, ChatMessage, ChatState } from '../../types';

// Enhanced chat store interface
interface ChatStore extends ChatState {
  // Session management
  readonly setSessions: (sessions: ChatSession[]) => void;
  readonly addSession: (session: ChatSession) => void;
  readonly updateSession: (sessionId: string, updates: Partial<ChatSession>) => void;
  readonly deleteSession: (sessionId: string) => void;
  readonly setCurrentSession: (sessionId: string | null) => void;
  
  // Message management
  readonly addMessage: (sessionId: string, message: ChatMessage) => void;
  readonly updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  readonly deleteMessage: (sessionId: string, messageId: string) => void;
  
  // UI state
  readonly setLoading: (loading: boolean) => void;
  readonly setError: (error: string | null) => void;
  readonly clearError: () => void;
  
  // Computed properties
  readonly getCurrentSession: () => ChatSession | null;
  readonly getMessageCount: (sessionId?: string) => number;
  readonly getSessionById: (sessionId: string) => ChatSession | undefined;
}

const API_BASE_URL = process.env['NODE_ENV'] === 'production' 
  ? 'https://your-api-domain.com/api' 
  : 'http://localhost:5000/api';

// Enhanced API client for chat operations
class ChatApiClient {
  private static getAuthHeaders(): Record<string, string> {
    const token = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private static async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  }

  static async getSessions(limit = 50, offset = 0): Promise<ChatSession[]> {
    return this.makeRequest<ChatSession[]>(
      `/chat/sessions?limit=${limit}&offset=${offset}`
    );
  }

  static async createSession(session: Partial<ChatSession>): Promise<ChatSession> {
    return this.makeRequest<ChatSession>('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    });
  }

  static async updateSession(sessionId: string, updates: Partial<ChatSession>): Promise<void> {
    return this.makeRequest<void>(`/chat/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  static async deleteSession(sessionId: string): Promise<void> {
    return this.makeRequest<void>(`/chat/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }
}

export const useChatStore = create<ChatStore>()(  
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      isLoading: false,
      error: null,

      setSessions: (sessions: ChatSession[]) => set({ sessions }),
      
      addSession: (session: ChatSession) => 
        set((state) => ({ 
          sessions: [session, ...state.sessions],
          currentSessionId: session.id 
        })),
      
      updateSession: (sessionId: string, updates: Partial<ChatSession>) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId ? { ...session, ...updates } : session
          ),
        })),
      
      deleteSession: (sessionId: string) =>
        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== sessionId);
          const newCurrentId = state.currentSessionId === sessionId 
            ? (newSessions[0]?.id || null) 
            : state.currentSessionId;
          
          return {
            sessions: newSessions,
            currentSessionId: newCurrentId,
          };
        }),
      
      setCurrentSession: (sessionId: string | null) => set({ currentSessionId: sessionId }),
      
      addMessage: (sessionId: string, message: ChatMessage) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, messages: [...session.messages, message] }
              : session
          ),
        })),

      updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.map((msg) =>
                    msg.id === messageId ? { ...msg, ...updates } : msg
                  ),
                }
              : session
          ),
        })),

      deleteMessage: (sessionId: string, messageId: string) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.filter((msg) => msg.id !== messageId),
                }
              : session
          ),
        })),
      
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),
      
      getCurrentSession: () => {
        const state = get();
        return state.sessions.find((s) => s.id === state.currentSessionId) || null;
      },

      getMessageCount: (sessionId?: string) => {
        const state = get();
        if (sessionId) {
          const session = state.sessions.find((s) => s.id === sessionId);
          return session?.messages.length || 0;
        }
        return state.sessions.reduce((total, session) => total + session.messages.length, 0);
      },

      getSessionById: (sessionId: string) => {
        const state = get();
        return state.sessions.find((s) => s.id === sessionId);
      },
    }),
    {
      name: 'chat-storage',
      partialize: (state: ChatStore) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
      }),
    }
  )
);
