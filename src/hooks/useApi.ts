import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { ChatSession } from '../types';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-api-domain.com/api' 
  : 'http://localhost:5000/api';

// Custom fetch wrapper with auth
const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const { token } = useAuthStore.getState();
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
};

// Chat Sessions API hooks
export const useChatSessions = () => {
  const { isAuthenticated } = useAuthStore();
  
  return useQuery({
    queryKey: ['chatSessions'],
    queryFn: () => apiFetch('/chat/sessions'),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

export const useCreateChatSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (sessionData: Partial<ChatSession>) =>
      apiFetch('/chat/sessions', {
        method: 'POST',
        body: JSON.stringify(sessionData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
    },
  });
};

export const useUpdateChatSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sessionId, updates }: { sessionId: string; updates: Partial<ChatSession> }) =>
      apiFetch(`/chat/sessions/${sessionId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
    },
  });
};

export const useDeleteChatSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch(`/chat/sessions/${sessionId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
    },
  });
};

// User Preferences API hooks
export const useUserPreferences = () => {
  const { isAuthenticated } = useAuthStore();
  
  return useQuery({
    queryKey: ['userPreferences'],
    queryFn: () => apiFetch('/user/preferences'),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (preferences: any) =>
      apiFetch('/user/preferences', {
        method: 'PUT',
        body: JSON.stringify({ preferences }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPreferences'] });
    },
  });
};

// User Profile API hooks
export const useUserProfile = () => {
  const { isAuthenticated } = useAuthStore();
  
  return useQuery({
    queryKey: ['userProfile'],
    queryFn: () => apiFetch('/user/profile'),
    enabled: isAuthenticated,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};