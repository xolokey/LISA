import { 
  generateChatResponse, 
  analyzeSentiment, 
  generateChatTitle,
  generateImage,
  editImage,
  performSemanticSearch
} from '../../../services/geminiService';
import { Language, Persona } from '../../../types';

// Mock the GoogleGenAI
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: jest.fn(),
    },
    chats: {
      create: jest.fn(),
    },
  })),
  Type: {
    OBJECT: 'object',
    STRING: 'string',
    ARRAY: 'array',
  },
  Modality: {
    IMAGE: 'image',
    TEXT: 'text',
  },
}));

describe('GeminiService', () => {
  let mockGenerateContent: jest.Mock;
  let mockChatCreate: jest.Mock;
  let mockSendMessage: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock responses
    mockGenerateContent = jest.fn();
    mockSendMessage = jest.fn();
    mockChatCreate = jest.fn().mockReturnValue({
      sendMessage: mockSendMessage,
    });

    // Mock the GoogleGenAI instance
    const { GoogleGenAI } = require('@google/genai');
    GoogleGenAI.mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
      chats: {
        create: mockChatCreate,
      },
    }));
  });

  describe('generateChatResponse', () => {
    it('should generate a basic chat response', async () => {
      mockSendMessage.mockResolvedValue({
        text: 'Hello! How can I help you today?',
        candidates: [{
          content: {
            parts: [{ text: 'Hello! How can I help you today?' }]
          }
        }]
      });

      const result = await generateChatResponse(
        [],
        'Hello',
        Language.ENGLISH,
        'Neutral',
        false
      );

      expect(result.content).toBe('Hello! How can I help you today?');
      expect(mockChatCreate).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        history: [],
        config: expect.objectContaining({
          systemInstruction: expect.stringContaining('Lisa')
        })
      });
    });

    it('should handle function calls for reminders', async () => {
      mockSendMessage
        .mockResolvedValueOnce({
          candidates: [{
            content: {
              parts: [{
                functionCall: {
                  name: 'addReminder',
                  args: { task: 'Test reminder', time: '2024-01-01T10:00:00Z' }
                }
              }]
            }
          }]
        })
        .mockResolvedValueOnce({
          text: 'Reminder added successfully!'
        });

      const result = await generateChatResponse(
        [],
        'Remind me to test at 10am tomorrow',
        Language.ENGLISH,
        'Neutral',
        false
      );

      expect(result.content).toBe('Reminder added successfully!');
      expect(result.reminder).toEqual({
        task: 'Test reminder',
        time: '2024-01-01T10:00:00Z'
      });
    });

    it('should handle errors gracefully', async () => {
      mockSendMessage.mockRejectedValue(new Error('API Error'));

      await expect(generateChatResponse(
        [],
        'Hello',
        Language.ENGLISH,
        'Neutral',
        false
      )).rejects.toThrow('API Error');
    });

    it('should include file in message when provided', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      mockSendMessage.mockResolvedValue({
        text: 'File processed successfully',
        candidates: [{
          content: {
            parts: [{ text: 'File processed successfully' }]
          }
        }]
      });

      await generateChatResponse(
        [],
        'Process this file',
        Language.ENGLISH,
        'Neutral',
        false,
        mockFile
      );

      expect(mockSendMessage).toHaveBeenCalledWith({
        message: expect.arrayContaining([
          { text: 'Process this file' },
          expect.objectContaining({ inlineData: expect.any(Object) })
        ])
      });
    });
  });

  describe('analyzeSentiment', () => {
    it('should analyze positive sentiment', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'positive'
      });

      const result = await analyzeSentiment('I love this application!');

      expect(result).toBe('positive');
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.stringContaining('positive, negative, or neutral')
        })
      );
    });

    it('should analyze negative sentiment', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'negative'
      });

      const result = await analyzeSentiment('This is terrible!');

      expect(result).toBe('negative');
    });

    it('should handle neutral sentiment', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'neutral'
      });

      const result = await analyzeSentiment('The weather is okay.');

      expect(result).toBe('neutral');
    });

    it('should default to neutral for invalid responses', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'invalid_response'
      });

      const result = await analyzeSentiment('Some text');

      expect(result).toBe('neutral');
    });
  });

  describe('generateChatTitle', () => {
    it('should generate a concise title', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'Code Help Request'
      });

      const result = await generateChatTitle('Help me write a function');

      expect(result).toBe('Code Help Request');
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.stringContaining('4-5 words max')
        })
      );
    });

    it('should remove quotes from title', async () => {
      mockGenerateContent.mockResolvedValue({
        text: '"Code Help Request"'
      });

      const result = await generateChatTitle('Help me write a function');

      expect(result).toBe('Code Help Request');
    });
  });

  describe('performSemanticSearch', () => {
    it('should search and return files', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'Found marketing strategy and financial report files.'
      });

      const result = await performSemanticSearch('marketing', Language.ENGLISH);

      expect(result.summary).toBe('Found marketing strategy and financial report files.');
      expect(result.files).toBeDefined();
      expect(Array.isArray(result.files)).toBe(true);
    });

    it('should handle no results', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'No files found matching your query.'
      });

      const result = await performSemanticSearch('nonexistent', Language.ENGLISH);

      expect(result.summary).toBe('No files found matching your query.');
      expect(result.files).toBeDefined();
    });
  });

  describe('generateImage', () => {
    it('should generate an image', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      });

      const result = await generateImage('A beautiful sunset', '16:9');

      expect(result).toContain('data:image/png;base64');
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.stringContaining('A beautiful sunset')
        })
      );
    });
  });

  describe('editImage', () => {
    it('should edit an image', async () => {
      const mockFile = new File(['image data'], 'test.jpg', { type: 'image/jpeg' });
      
      mockGenerateContent.mockResolvedValue({
        text: 'data:image/png;base64,edited_image_data'
      });

      const result = await editImage('Make it brighter', mockFile);

      expect(result).toBeDefined();
      expect(mockGenerateContent).toHaveBeenCalled();
    });
  });
});