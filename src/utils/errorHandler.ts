import React from 'react';
import type { ApiError } from '../../types';
import { logger } from './logger';

// Enhanced error types for better error handling
export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly isOperational: boolean;
  readonly context?: Record<string, unknown> | undefined;

  constructor(
    message: string,
    code: string = 'GENERIC_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown> | undefined
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export class ValidationError extends AppError {
  readonly field?: string | undefined;

  constructor(message: string, field?: string | undefined, context?: Record<string, unknown> | undefined) {
    super(message, 'VALIDATION_ERROR', 400, true, context);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', 401, true, context);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', 403, true, context);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', context?: Record<string, unknown>) {
    super(`${resource} not found`, 'NOT_FOUND_ERROR', 404, true, context);
    this.name = 'NotFoundError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', 0, true, context);
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends AppError {
  readonly retryAfter?: number | undefined;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number | undefined,
    context?: Record<string, unknown> | undefined
  ) {
    super(message, 'RATE_LIMIT_ERROR', 429, true, context);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// Error handler class for centralized error management
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: Array<(error: AppError) => void> = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Subscribe to error events
  subscribe(listener: (error: AppError) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  // Handle errors centrally
  handle(error: unknown): AppError {
    const processedError = this.processError(error);
    
    // Log the error with context
    logger.logError(processedError, {
      code: processedError.code,
      statusCode: processedError.statusCode,
      isOperational: processedError.isOperational,
      context: processedError.context,
      stack: processedError.stack
    });
    
    // Notify all listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(processedError);
      } catch (err) {
        logger.error('Error in error listener', { error: err });
      }
    });

    return processedError;
  }

  private processError(error: unknown): AppError {
    // If it's already our custom error, return it
    if (error instanceof AppError) {
      return error;
    }

    // Handle API errors
    if (this.isApiError(error)) {
      return new AppError(
        error.error,
        'API_ERROR',
        error.statusCode || 500,
        true,
        { details: error.details }
      );
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new NetworkError('Network request failed. Please check your connection.');
    }

    // Handle standard JavaScript errors
    if (error instanceof Error) {
      return new AppError(
        error.message,
        'JAVASCRIPT_ERROR',
        500,
        false,
        { stack: error.stack }
      );
    }

    // Handle unknown errors
    return new AppError(
      'An unexpected error occurred',
      'UNKNOWN_ERROR',
      500,
      false,
      { originalError: error }
    );
  }

  private isApiError(error: unknown): error is ApiError {
    return (
      typeof error === 'object' && 
      error !== null && 
      'error' in error &&
      typeof (error as ApiError).error === 'string'
    );
  }

  // Get user-friendly error message
  getUserMessage(error: AppError): string {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return error.message;
      case 'AUTHENTICATION_ERROR':
        return 'Please log in to continue.';
      case 'AUTHORIZATION_ERROR':
        return 'You don\'t have permission to perform this action.';
      case 'NOT_FOUND_ERROR':
        return error.message;
      case 'NETWORK_ERROR':
        return 'Unable to connect. Please check your internet connection.';
      case 'RATE_LIMIT_ERROR':
        const rateLimitError = error as RateLimitError;
        return rateLimitError.retryAfter 
          ? `Too many requests. Please try again in ${rateLimitError.retryAfter} seconds.`
          : 'Too many requests. Please try again later.';
      case 'API_ERROR':
        return error.message || 'Server error occurred. Please try again.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  // Check if error should be retried
  isRetryable(error: AppError): boolean {
    const retryableCodes = ['NETWORK_ERROR', 'RATE_LIMIT_ERROR'];
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    
    return (
      retryableCodes.includes(error.code) ||
      retryableStatusCodes.includes(error.statusCode)
    );
  }

  // Get retry delay for retryable errors
  getRetryDelay(error: AppError, attempt: number): number {
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000; // convert to milliseconds
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  }
}

// Utility functions for common error handling patterns
export const errorHandler = ErrorHandler.getInstance();

export const handleApiError = (error: unknown): never => {
  throw errorHandler.handle(error);
};

export const handleAsyncError = async <T>(
  asyncFn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> => {
  try {
    return await asyncFn();
  } catch (error) {
    const processedError = errorHandler.handle(error);
    if (context && processedError instanceof AppError) {
      // Create new error with merged context since context is readonly
      const mergedContext = { ...processedError.context, ...context };
      throw new AppError(
        processedError.message,
        processedError.code,
        processedError.statusCode,
        processedError.isOperational,
        mergedContext
      );
    }
    throw processedError;
  }
};

export const createErrorBoundary = (
  fallback: (error: AppError) => React.ReactElement
) => {
  return class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { error: AppError | null }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error): { error: AppError } {
      return { error: errorHandler.handle(error) };
    }

    override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      const processedError = errorHandler.handle(error);
      // Create new error with merged context since context is readonly
      const mergedContext = {
        ...processedError.context,
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown'
      };
      
      // Create a new error instance with the merged context
      const errorWithContext = new AppError(
        processedError.message,
        processedError.code,
        processedError.statusCode,
        processedError.isOperational,
        mergedContext
      );
      
      // Log the error with enhanced context
      logger.logError(errorWithContext, mergedContext);
    }

    override render() {
      if (this.state.error) {
        return fallback(this.state.error);
      }

      return this.props.children;
    }
  };
};

// React hook for error handling
export const useErrorHandler = () => {
  const [error, setError] = React.useState<AppError | null>(null);

  const handleError = React.useCallback((error: unknown) => {
    const processedError = errorHandler.handle(error);
    setError(processedError);
    return processedError;
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const retry = React.useCallback((fn: () => void | Promise<void>) => {
    clearError();
    Promise.resolve(fn()).catch(handleError);
  }, [handleError, clearError]);

  return {
    error,
    handleError,
    clearError,
    retry,
    isRetryable: error ? errorHandler.isRetryable(error) : false,
    userMessage: error ? errorHandler.getUserMessage(error) : null,
  };
};

// Promise wrapper with automatic retry logic
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  context?: Record<string, unknown>
): Promise<T> => {
  let lastError: AppError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = errorHandler.handle(error);
      
      if (attempt === maxAttempts || !errorHandler.isRetryable(lastError)) {
        throw lastError;
      }

      const delay = errorHandler.getRetryDelay(lastError, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError; // This should never be reached, but TypeScript requires it
};

// Global error store using Zustand for state management
interface ErrorStore {
  readonly errors: AppError[];
  readonly currentError: AppError | null;
  addError: (error: AppError) => void;
  removeError: (errorId: string) => void;
  clearErrors: () => void;
  setCurrentError: (error: AppError | null) => void;
}

// Create error store (implementation would use Zustand)
export const createErrorStore = () => {
  const errors: AppError[] = [];
  let currentError: AppError | null = null;
  
  return {
    get errors() { return [...errors]; },
    get currentError() { return currentError; },
    
    addError: (error: AppError) => {
      errors.push(error);
      logger.info('Error added to store', { errorCode: error.code, errorId: error.message });
    },
    
    removeError: (errorId: string) => {
      const index = errors.findIndex(e => e.message === errorId);
      if (index > -1) {
        errors.splice(index, 1);
        logger.info('Error removed from store', { errorId });
      }
    },
    
    clearErrors: () => {
      errors.length = 0;
      currentError = null;
      logger.info('All errors cleared from store');
    },
    
    setCurrentError: (error: AppError | null) => {
      currentError = error;
      if (error) {
        logger.warn('Current error set', { errorCode: error.code });
      }
    }
  };
};

// Social Authentication Error Handling (following project memory)
export class SocialAuthError extends AppError {
  readonly provider: string;
  readonly authStep: string;

  constructor(
    message: string,
    provider: string,
    authStep: string = 'unknown',
    context?: Record<string, unknown>
  ) {
    super(message, 'SOCIAL_AUTH_ERROR', 401, true, context);
    this.name = 'SocialAuthError';
    this.provider = provider;
    this.authStep = authStep;
  }
}

// Enhanced error utilities for social authentication
export const handleSocialAuthError = (error: unknown, provider: string): SocialAuthError => {
  if (error instanceof SocialAuthError) {
    return error;
  }

  // Handle Firebase auth errors
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const firebaseError = error as { code: string; message: string };
    
    switch (firebaseError.code) {
      case 'auth/popup-blocked':
        return new SocialAuthError(
          'Pop-up was blocked. Please allow pop-ups for this site.',
          provider,
          'popup',
          { originalCode: firebaseError.code }
        );
      case 'auth/popup-closed-by-user':
        return new SocialAuthError(
          'Sign-in was cancelled. Please try again.',
          provider,
          'popup',
          { originalCode: firebaseError.code }
        );
      case 'auth/cancelled-popup-request':
        return new SocialAuthError(
          'Another sign-in is already in progress.',
          provider,
          'popup',
          { originalCode: firebaseError.code }
        );
      case 'auth/network-request-failed':
        return new SocialAuthError(
          'Network error. Please check your connection and try again.',
          provider,
          'network',
          { originalCode: firebaseError.code }
        );
      default:
        return new SocialAuthError(
          firebaseError.message || 'Social authentication failed',
          provider,
          'unknown',
          { originalCode: firebaseError.code }
        );
    }
  }

  // Handle generic errors
  return new SocialAuthError(
    error instanceof Error ? error.message : 'Unknown social authentication error',
    provider,
    'unknown',
    { originalError: error }
  );
};
// Initialize error store integration
export const initializeErrorHandling = () => {
  const errorStore = createErrorStore();
  
  // Subscribe to global error events
  errorHandler.subscribe((error: AppError) => {
    errorStore.addError(error);
  });
  
  // Handle unhandled promise rejections
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      const error = errorHandler.handle(event.reason);
      errorStore.setCurrentError(error);
      event.preventDefault();
    });
    
    // Handle uncaught exceptions
    window.addEventListener('error', (event) => {
      const error = errorHandler.handle(event.error || event.message);
      errorStore.setCurrentError(error);
      event.preventDefault();
    });
  }
  
  return errorStore;
};