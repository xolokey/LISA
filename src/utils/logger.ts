// Enhanced client-side logging system
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  readonly timestamp: number;
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: Record<string, unknown>;
  readonly source?: string | undefined;
  readonly userId?: string | undefined;
  readonly sessionId?: string | undefined;
}

// Main logger class
export class Logger {
  private static instance: Logger;
  private minLevel: LogLevel = LogLevel.INFO;
  private context: Record<string, unknown> = {};
  private userId?: string;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  setContext(context: Record<string, unknown>): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    source?: string
  ): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context: { ...this.context, ...context },
      source,
      userId: this.userId,
      sessionId: this.sessionId,
    };

    // Console output with colors
    const levelName = LogLevel[level];
    const timestamp = new Date(entry.timestamp).toISOString();
    const colors = {
      [LogLevel.DEBUG]: '#888',
      [LogLevel.INFO]: '#007acc',
      [LogLevel.WARN]: '#ff8c00',
      [LogLevel.ERROR]: '#ff0000',
    };
    
    const color = colors[level];
    console.log(
      `%c[${timestamp}] ${levelName}: ${message}`,
      `color: ${color}; font-weight: bold`,
      context ? '\nContext:' : '',
      context || ''
    );

    // Store in localStorage for persistence
    this.persistLog(entry);
  }

  private persistLog(entry: LogEntry): void {
    try {
      const logs = this.getLogs();
      logs.push(entry);
      
      // Keep only the latest 1000 entries
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }
      
      localStorage.setItem('app_logs', JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to persist log:', error);
    }
  }

  getLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem('app_logs');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to read logs:', error);
      return [];
    }
  }

  clearLogs(): void {
    localStorage.removeItem('app_logs');
  }

  debug(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log(LogLevel.DEBUG, message, context, source);
  }

  info(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log(LogLevel.INFO, message, context, source);
  }

  warn(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log(LogLevel.WARN, message, context, source);
  }

  error(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log(LogLevel.ERROR, message, context, source);
  }

  // Helper methods for common patterns
  logUserAction(action: string, details?: Record<string, unknown>): void {
    this.info(`User action: ${action}`, details, 'user_action');
  }

  logApiCall(method: string, url: string, duration?: number, status?: number): void {
    this.info(`API call: ${method} ${url}`, {
      method,
      url,
      duration,
      status,
    }, 'api_call');
  }

  logError(error: Error, context?: Record<string, unknown>): void {
    this.error(error.message, {
      name: error.name,
      stack: error.stack,
      ...context,
    }, 'error');
  }

  logPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.info(`Performance: ${metric}`, {
      metric,
      value,
      unit,
    }, 'performance');
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience functions
export const logInfo = (message: string, context?: Record<string, unknown>) => 
  logger.info(message, context);

export const logError = (message: string, context?: Record<string, unknown>) => 
  logger.error(message, context);

export const logWarn = (message: string, context?: Record<string, unknown>) => 
  logger.warn(message, context);

export const logDebug = (message: string, context?: Record<string, unknown>) => 
  logger.debug(message, context);

// Performance monitoring helper
export const measurePerformance = <T>(name: string, fn: () => T): T => {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  logger.logPerformance(name, duration);
  return result;
};

export const measureAsyncPerformance = async <T>(
  name: string, 
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  logger.logPerformance(name, duration);
  return result;
};