import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../utils/logger';

// Simple Card component for ErrorBoundary
const Card: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-6 ${className}`}>
    {children}
  </div>
);

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error | undefined;
  errorInfo?: ErrorInfo | undefined;
  errorId?: string | undefined;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced error logging
    logger.logError(error, {
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    logger.logUserAction('error_boundary_reload', {
      errorId: this.state.errorId,
      errorMessage: this.state.error?.message,
    });
    window.location.reload();
  };

  handleReset = () => {
    logger.logUserAction('error_boundary_reset', {
      errorId: this.state.errorId,
      errorMessage: this.state.error?.message,
    });
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined });
  };

  handleReportError = () => {
    if (this.state.error && this.state.errorId) {
      logger.logUserAction('error_boundary_report', {
        errorId: this.state.errorId,
        errorMessage: this.state.error.message,
      });
      
      // You could implement error reporting to an external service here
      alert(`Error reported with ID: ${this.state.errorId}`);
    }
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDevelopment = process.env['NODE_ENV'] === 'development';

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background dark:bg-dark-background">
          <Card className="max-w-lg w-full text-center">
            <div className="text-red-500 mb-4 flex justify-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M15 9l-6 6" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 9l6 6" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            
            <h2 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-2">
              Something went wrong
            </h2>
            
            <p className="text-text-secondary dark:text-dark-text-secondary mb-2">
              We're sorry, but something unexpected happened. 
            </p>
            
            {this.state.errorId && (
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-6">
                Error ID: <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">
                  {this.state.errorId}
                </code>
              </p>
            )}
            
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReportError}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Report Error
              </button>
            </div>
            
            {isDevelopment && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary transition-colors">
                  🔧 Error Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 dark:bg-slate-800 rounded text-xs overflow-auto">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.name}
                  </div>
                  <div className="mb-2">
                    <strong>Message:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div className="mb-2">
                      <strong>Stack Trace:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;