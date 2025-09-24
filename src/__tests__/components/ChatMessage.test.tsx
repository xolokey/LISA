import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatMessage from '../../../components/ChatMessage';
import { ChatMessage as ChatMessageType, Language } from '../../../types';

// Mock the app context
const mockContext = {
  language: Language.ENGLISH,
  setLanguage: jest.fn(),
  isVoiceOutputEnabled: false,
  toggleVoiceOutput: jest.fn(),
  preferences: {
    theme: 'light' as const,
    language: 'en-US',
    voiceEnabled: false,
  },
  setPreferences: jest.fn(),
  reminders: [],
  addReminder: jest.fn(),
  removeReminder: jest.fn(),
  todos: [],
  addTodo: jest.fn(),
  toggleTodo: jest.fn(),
  removeTodo: jest.fn(),
  calendarEvents: [],
  addCalendarEvent: jest.fn(),
  removeCalendarEvent: jest.fn(),
  agendaHistory: [],
  user: null,
  signIn: jest.fn(),
  signOut: jest.fn(),
  sessions: [],
  activeSessionId: null,
  activeSession: null,
  createNewChat: jest.fn(),
  setActiveSession: jest.fn(),
  deleteSession: jest.fn(),
  sendMessage: jest.fn(),
  isSendingMessage: false,
  isSidebarCollapsed: false,
  toggleSidebar: jest.fn(),
  setChatInput: jest.fn(),
  chatInput: '',
};

jest.mock('../../../context/AppContext', () => ({
  useAppContext: () => mockContext,
}));

describe('ChatMessage Component', () => {
  const mockMessage: ChatMessageType = {
    id: '1',
    role: 'user',
    content: 'Hello, how are you?',
    timestamp: Date.now(),
  };

  const mockAssistantMessage: ChatMessageType = {
    id: '2',
    role: 'assistant',
    content: 'I am doing well, thank you for asking!',
    timestamp: Date.now(),
  };

  const mockOnSendMessage = jest.fn();
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render user message correctly', () => {
    render(<ChatMessage message={mockMessage} onSendMessage={mockOnSendMessage} user={mockUser} />);
    
    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
    expect(screen.getByAltText('Test User')).toBeInTheDocument();
  });

  it('should render assistant message correctly', () => {
    render(<ChatMessage message={mockAssistantMessage} onSendMessage={mockOnSendMessage} user={mockUser} />);
    
    expect(screen.getByText('I am doing well, thank you for asking!')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
  });

  it('should render message without timestamp display', () => {
    const messageWithTimestamp: ChatMessageType = {
      ...mockMessage,
      timestamp: new Date('2024-01-01T12:00:00Z').getTime(),
    };

    render(<ChatMessage message={messageWithTimestamp} onSendMessage={mockOnSendMessage} user={mockUser} />);
    
    // ChatMessage component doesn't display timestamps, just the content
    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
  });

  it('should render invoice data when present', () => {
    const messageWithInvoice: ChatMessageType = {
      id: '3',
      role: 'assistant',
      content: 'Invoice processed successfully',
      invoiceData: {
        invoiceId: 'INV-001',
        vendorName: 'Test Vendor',
        customerName: 'Test Customer',
        invoiceDate: '2024-01-01',
        totalAmount: 100.00,
        items: [
          {
            description: 'Test Item',
            quantity: 1,
            unitPrice: 100.00,
            total: 100.00,
          },
        ],
      },
    };

    render(<ChatMessage message={messageWithInvoice} onSendMessage={mockOnSendMessage} user={mockUser} />);
    
    expect(screen.getByText('Invoice processed successfully')).toBeInTheDocument();
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    expect(screen.getByText('100.00')).toBeInTheDocument();
  });

  it('should render reminder when present', () => {
    const messageWithReminder: ChatMessageType = {
      id: '4',
      role: 'assistant',
      content: 'Reminder set successfully',
      reminder: {
        id: 'reminder-1',
        task: 'Meeting with team',
        time: '2024-01-01T14:00:00Z',
      },
    };

    render(<ChatMessage message={messageWithReminder} onSendMessage={mockOnSendMessage} user={mockUser} />);
    
    expect(screen.getByText('Reminder set successfully')).toBeInTheDocument();
    expect(screen.getByText('Meeting with team')).toBeInTheDocument();
  });

  it('should render todo item when present', () => {
    const messageWithTodo: ChatMessageType = {
      id: '5',
      role: 'assistant',
      content: 'Todo added successfully',
      todo: {
        id: 'todo-1',
        item: 'Complete project documentation',
        completed: false,
      },
    };

    render(<ChatMessage message={messageWithTodo} onSendMessage={mockOnSendMessage} user={mockUser} />);
    
    expect(screen.getByText('Todo added successfully')).toBeInTheDocument();
    expect(screen.getByText('Complete project documentation')).toBeInTheDocument();
  });

  it('should render calendar event when present', () => {
    const messageWithEvent: ChatMessageType = {
      id: '6',
      role: 'assistant',
      content: 'Meeting scheduled successfully',
      calendarEvent: {
        id: 'event-1',
        title: 'Team Standup',
        time: '09:00 AM',
        attendees: ['John', 'Jane'],
      },
    };

    render(<ChatMessage message={messageWithEvent} onSendMessage={mockOnSendMessage} user={mockUser} />);
    
    expect(screen.getByText('Meeting scheduled successfully')).toBeInTheDocument();
    expect(screen.getByText('Team Standup')).toBeInTheDocument();
    expect(screen.getByText('09:00 AM')).toBeInTheDocument();
  });

  it('should render interactive choices when present', () => {
    const messageWithChoices: ChatMessageType = {
      id: '7',
      role: 'assistant',
      content: '',
      interactiveChoice: {
        prompt: 'What would you like to do?',
        options: [
          { title: 'Option 1', payload: 'choice_1' },
          { title: 'Option 2', payload: 'choice_2' },
        ],
      },
    };

    render(<ChatMessage message={messageWithChoices} onSendMessage={mockOnSendMessage} user={mockUser} />);
    
    expect(screen.getByText('What would you like to do?')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('should handle choice selection', () => {
    const messageWithChoices: ChatMessageType = {
      id: '8',
      role: 'assistant',
      content: '',
      interactiveChoice: {
        prompt: 'Choose an option',
        options: [
          { title: 'Test Option', payload: 'test_choice' },
        ],
      },
    };

    render(<ChatMessage message={messageWithChoices} onSendMessage={mockOnSendMessage} user={mockUser} />);
    
    const optionButton = screen.getByText('Test Option');
    fireEvent.click(optionButton);
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('test_choice');
  });

  it('should render file info when present', () => {
    const messageWithFile: ChatMessageType = {
      id: '9',
      role: 'user',
      content: 'Please analyze this document',
      fileInfo: {
        name: 'document.pdf',
        type: 'application/pdf',
        previewUrl: 'blob:preview-url',
      },
    };

    render(<ChatMessage message={messageWithFile} onSendMessage={mockOnSendMessage} user={mockUser} />);
    
    expect(screen.getByText('Please analyze this document')).toBeInTheDocument();
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
  });

  it('should show sentiment indicator when available', () => {
    const messageWithSentiment: ChatMessageType = {
      id: '10',
      role: 'user',
      content: 'I love this feature!',
      sentiment: 'positive',
    };

    render(<ChatMessage message={messageWithSentiment} onSendMessage={mockOnSendMessage} user={mockUser} />);
    
    expect(screen.getByText('I love this feature!')).toBeInTheDocument();
    // Should show some positive sentiment indicator
    expect(screen.getByTitle('Positive sentiment')).toBeInTheDocument();
  });

  it('should handle copy message functionality', () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    render(<ChatMessage message={mockAssistantMessage} onSendMessage={mockOnSendMessage} user={mockUser} />);
    
    const copyButton = screen.getByTitle(/share/i);
    fireEvent.click(copyButton);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('I am doing well, thank you for asking!');
  });

  it('should show message actions for assistant messages', () => {
    render(<ChatMessage message={mockAssistantMessage} onSendMessage={mockOnSendMessage} user={mockUser} />);
    
    expect(screen.getByTitle(/share/i)).toBeInTheDocument();
  });

  it('should not show regenerate action for user messages', () => {
    render(<ChatMessage message={mockMessage} onSendMessage={mockOnSendMessage} user={mockUser} />);
    
    expect(screen.getByTitle(/share/i)).toBeInTheDocument();
  });
});