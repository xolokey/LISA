import { ReactNode } from 'react';

// ==========================================
// Core Types & Interfaces
// ==========================================

export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: 'user' | 'admin';
  readonly createdAt: string;
  readonly updatedAt?: string;
}

export interface AuthState {
  readonly user: User | null;
  readonly token: string | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;
}

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

export interface RegisterData {
  readonly email: string;
  readonly password: string;
  readonly name: string;
}

export interface AuthResponse {
  readonly message: string;
  readonly token: string;
  readonly user: User;
}

// ==========================================
// Legacy/Existing Types (preserved)
// ==========================================

export enum Language {
  ENGLISH = 'en-US',
  TAMIL = 'ta-IN',
  HINDI = 'hi-IN',
  SPANISH = 'es-ES',
  FRENCH = 'fr-FR',
  GERMAN = 'de-DE',
  JAPANESE = 'ja-JP',
}

export type Persona = 'Formal' | 'Neutral' | 'Casual';
export type Theme = 'light' | 'dark' | 'system';

export interface GoogleUser {
    name: string;
    email: string;
    picture: string;
}

export interface UserPreferences {
  readonly id?: string;
  readonly userId?: string;
  readonly theme: Theme;
  readonly language: string;
  readonly voiceEnabled: boolean;
  readonly notificationsEnabled?: boolean;
  readonly persona?: Persona;
  readonly customSettings?: {
    readonly defaultModel?: string;
    readonly codeHighlighting?: boolean;
    readonly showLineNumbers?: boolean;
    readonly fontSize?: number;
    readonly [key: string]: unknown;
  };
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface Reminder {
    id: string;
    task: string;
    time: string;
    date?: string; 
}

export interface TodoItem {
    id: string;
    item: string;
    completed: boolean;
}

export interface CalendarEvent {
    id: string;
    title: string;
    time: string;
    attendees?: string[];
    date?: string; 
}

export interface DraftEmail {
    to: string;
    subject: string;
    body: string;
}

export interface InvoiceData {
  invoiceId: string;
  vendorName: string;
  customerName: string;
  invoiceDate: string;
  totalAmount: number;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

export type Sentiment = 'positive' | 'negative' | 'neutral';

export interface FileSearchResult {
    summary: string;
    files: {
        name: string;
        path: string;
        type: 'pdf' | 'doc' | 'code' | 'generic';
    }[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

// ==========================================
// Enhanced Chat & Messaging Types
// ==========================================

export type MessageRole = 'user' | 'model' | 'assistant' | 'system';

export interface ChatMessage {
  readonly id?: string;
  role: MessageRole;
  content: string; 
  readonly timestamp?: number;
  readonly metadata?: {
    readonly tokensUsed?: number;
    readonly model?: string;
    readonly duration?: number;
    readonly [key: string]: unknown;
  };
  fileInfo?: {
    name: string;
    type: string;
    previewUrl?: string;
  };
  sentiment?: Sentiment;
  // Structured data payloads
  invoiceData?: InvoiceData; 
  fileSearchResult?: FileSearchResult;
  reminder?: Reminder;
  todo?: TodoItem;
  draftEmail?: DraftEmail;
  calendarEvent?: CalendarEvent;
  // Task management confirmations
  todoToggled?: { item: string; completed: boolean };
  todoRemoved?: { item: string };
  reminderRemoved?: { task: string };
  // Interactive components
  interactiveChoice?: { prompt: string; options: { title: string; payload: string }[] };
  breakTimer?: { durationSeconds: number };
  // Grounding
  groundingChunks?: GroundingChunk[];
}

export interface ChatSession {
  readonly id: string;
  readonly userId?: string;
  readonly title: string;
  readonly messages: ChatMessage[];
  readonly createdAt: number;
  readonly updatedAt?: number;
}

export interface ChatState {
  readonly sessions: ChatSession[];
  readonly currentSessionId: string | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

export type ProjectFiles = { [filePath: string]: string };

// ==========================================
// API & Network Types
// ==========================================

export interface ApiError {
  readonly error: string;
  readonly details?: unknown;
  readonly statusCode?: number;
}

export interface ApiResponse<T> {
  readonly data?: T;
  readonly error?: string;
  readonly message?: string;
}

export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;
}

// ==========================================
// Usage Statistics Types
// ==========================================

export interface UsageStats {
  readonly id: string;
  readonly userId: string;
  readonly date: string;
  readonly feature: string;
  readonly tokensUsed: number;
  readonly requestsCount: number;
  readonly sessionDuration?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface UsageStatsSummary {
  readonly totalTokens: number;
  readonly totalRequests: number;
  readonly totalSessions: number;
  readonly avgSessionDuration: number;
  readonly topFeatures: Array<{
    readonly feature: string;
    readonly count: number;
  }>;
}

// ==========================================
// Document Types
// ==========================================

export interface Document {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly contentType: 'pdf' | 'text' | 'markdown' | 'html' | 'json';
  readonly fileSize?: number;
  readonly filePath?: string;
  readonly tags?: string;
  readonly isPublic: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ==========================================
// Component Props Types
// ==========================================

export interface BaseProps {
  readonly className?: string;
  readonly children?: ReactNode;
}

export interface LoadingProps extends BaseProps {
  readonly isLoading: boolean;
  readonly error?: string | null;
  readonly retry?: () => void;
}

export interface ModalProps extends BaseProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title?: string;
}

export interface FormProps extends BaseProps {
  readonly onSubmit: (data: unknown) => void | Promise<void>;
  readonly isLoading?: boolean;
  readonly error?: string | null;
}

// ==========================================
// Utility Types
// ==========================================

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequireOnly<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>;

export type Nullable<T> = T | null;

export type AsyncData<T> = {
  readonly data: T | null;
  readonly isLoading: boolean;
  readonly error: string | null;
};

// ==========================================
// Feature-specific Types
// ==========================================

// Code Generator
export interface CodeGenerationRequest {
  readonly prompt: string;
  readonly language: string;
  readonly framework?: string;
  readonly requirements?: readonly string[];
}

export interface CodeGenerationResponse {
  readonly code: string;
  readonly explanation: string;
  readonly suggestions?: readonly string[];
  readonly tokensUsed: number;
}

// Image Studio
export interface ImageGenerationRequest {
  readonly prompt: string;
  readonly size: '256x256' | '512x512' | '1024x1024';
  readonly style?: 'realistic' | 'artistic' | 'cartoon';
  readonly quality?: 'standard' | 'hd';
}

export interface ImageGenerationResponse {
  readonly imageUrl: string;
  readonly prompt: string;
  readonly metadata: {
    readonly size: string;
    readonly style?: string;
    readonly tokensUsed: number;
    readonly generatedAt: string;
  };
}

// ==========================================
// Store Types (for state management)
// ==========================================

export interface RootState {
  readonly auth: AuthState;
  readonly chat: ChatState;
  readonly preferences: UserPreferences | null;
  readonly ui: {
    readonly sidebarCollapsed: boolean;
    readonly theme: Theme;
    readonly isLoading: boolean;
  };
}

// ==========================================
// Hook Return Types
// ==========================================

export interface UseApiResult<T> {
  readonly data: T | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refetch: () => Promise<void>;
}

export interface UseMutationResult<TData, TVariables> {
  readonly mutate: (variables: TVariables) => Promise<TData>;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly reset: () => void;
}

// ==========================================
// Configuration Types
// ==========================================

export interface AppConfig {
  readonly apiBaseUrl: string;
  readonly version: string;
  readonly environment: 'development' | 'staging' | 'production';
  readonly features: {
    readonly voiceInput: boolean;
    readonly imageGeneration: boolean;
    readonly codeExecution: boolean;
    readonly realTimeCollaboration: boolean;
  };
  readonly limits: {
    readonly maxFileSize: number;
    readonly maxSessionDuration: number;
    readonly maxConcurrentSessions: number;
  };
}
