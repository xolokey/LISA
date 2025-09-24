import { logger } from '../../utils/logger';

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

beforeAll(() => {
  Object.assign(console, mockConsole);
});

beforeEach(() => {
  Object.values(mockConsole).forEach(mock => mock.mockClear());
});

describe('Logger', () => {
  describe('log levels', () => {
    it('should log info messages', () => {
      logger.info('Test info message');
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO'),
        'Test info message',
        'Context: {}'
      );
    });

    it('should log error messages', () => {
      logger.error('Test error message');
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR'),
        'Test error message',
        'Context: {}'
      );
    });

    it('should log warning messages', () => {
      logger.warn('Test warning message');
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN'),
        'Test warning message',
        'Context: {}'
      );
    });

    it('should log debug messages', () => {
      logger.debug('Test debug message');
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG'),
        'Test debug message',
        'Context: {}'
      );
    });
  });

  describe('context handling', () => {
    it('should include context in log messages', () => {
      const context = { userId: '123', action: 'login' };
      logger.info('User logged in', context);
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO'),
        'User logged in',
        `Context: ${JSON.stringify(context)}`
      );
    });

    it('should handle empty context', () => {
      logger.info('Simple message');
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO'),
        'Simple message',
        'Context: {}'
      );
    });

    it('should handle complex context objects', () => {
      const complexContext = {
        user: { id: '123', name: 'Test User' },
        metadata: { timestamp: '2024-01-01', version: '1.0.0' },
        array: [1, 2, 3]
      };
      
      logger.error('Complex error', complexContext);
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR'),
        'Complex error',
        expect.stringContaining('"user":{"id":"123","name":"Test User"}')
      );
    });
  });

  describe('timestamp formatting', () => {
    it('should include ISO timestamp in log messages', () => {
      logger.info('Timestamp test');
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/),
        'Timestamp test',
        'Context: {}'
      );
    });
  });

  describe('error object handling', () => {
    it('should properly log Error objects', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test (file.js:1:1)';
      
      logger.error('Error occurred', { error });
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR'),
        'Error occurred',
        expect.stringContaining('"message":"Test error"')
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.stringContaining('"stack":"Error: Test error')
      );
    });

    it('should handle circular references in context', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      expect(() => {
        logger.info('Circular test', { circular });
      }).not.toThrow();
      
      expect(mockConsole.log).toHaveBeenCalled();
    });
  });

  describe('performance logging', () => {
    it('should log performance metrics', () => {
      logger.logPerformance('API call completed', 150, 'ms');
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Performance: API call completed'),
        expect.objectContaining({
          metric: 'API call completed',
          value: 150,
          unit: 'ms'
        })
      );
    });
  });

  describe('structured logging', () => {
    it('should support structured logging format', () => {
      const structuredData = {
        event: 'user_action',
        userId: '123',
        action: 'file_upload',
        metadata: {
          filename: 'document.pdf',
          size: 1024000,
          type: 'application/pdf'
        }
      };
      
      logger.info('File uploaded', structuredData);
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO'),
        'File uploaded',
        expect.stringContaining('"event":"user_action"')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.stringContaining('"filename":"document.pdf"')
      );
    });
  });
});