import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthState, AuthResponse, LoginCredentials, RegisterData } from '../../types';

// Enhanced auth store interface
interface AuthStore extends AuthState {
  readonly login: (credentials: LoginCredentials) => Promise<void>;
  readonly register: (data: RegisterData) => Promise<void>;
  readonly logout: () => void;
  readonly clearError: () => void;
  readonly setLoading: (loading: boolean) => void;
  readonly refreshToken: () => Promise<void>;
  readonly checkAuthStatus: () => Promise<void>;
}

const API_BASE_URL = process.env['NODE_ENV'] === 'production' 
  ? 'https://your-api-domain.com/api' 
  : 'http://localhost:5000/api';

// Enhanced API client with better error handling
class AuthApiClient {
  private static async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
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

  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  static async register(data: RegisterData): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getUserProfile(token: string): Promise<User> {
    return this.makeRequest<User>('/user/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  static async refreshToken(token: string): Promise<{ token: string }> {
    return this.makeRequest<{ token: string }>('/auth/refresh', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

export const useAuthStore = create<AuthStore>()(  
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await AuthApiClient.login(credentials);
          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await AuthApiClient.register(data);
          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      refreshToken: async () => {
        const { token } = get();
        if (!token) {
          throw new Error('No token available for refresh');
        }

        try {
          const response = await AuthApiClient.refreshToken(token);
          set({ token: response.token });
        } catch (error) {
          // If refresh fails, logout user
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: 'Session expired',
          });
          throw error;
        }
      },

      checkAuthStatus: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const user = await AuthApiClient.getUserProfile(token);
          set({ user, isAuthenticated: true });
        } catch (error) {
          // Invalid token, logout
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state: AuthStore) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
