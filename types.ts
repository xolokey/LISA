
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

export interface UserPreferences {
    persona: Persona;
}

export interface Reminder {
    id: string;
    task: string;
    time: string;
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
    date?: string; // Added for historical events
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

export interface ChatMessage {
  role: 'user' | 'model';
  content: string; // Always a string for the main text part
  fileInfo?: {
    name: string;
    type: string;
    previewUrl?: string; // For images
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
}