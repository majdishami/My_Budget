interface LogContext {
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: LogContext;
  stack?: string;
}

class Logger {
  private logEntries: LogEntry[] = [];
  private maxEntries = 1000;

  private getConsoleMethod(level: string): 'log' | 'warn' | 'error' | 'debug' {
    switch (level) {
      case 'warn': return 'warn';
      case 'error': return 'error';
      case 'debug': return 'debug';
      default: return 'log';
    }
  }

  private createLogEntry(level: LogEntry['level'], message: string, context?: any): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };

    if (level === 'error' && context?.error instanceof Error) {
      entry.stack = context.error.stack;
    }
    return entry;
  }

  public log(level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: any) {
    const entry = this.createLogEntry(level, message, context);
    this.logEntries.push(entry);

    // Trim old entries if exceeding max size
    if (this.logEntries.length > this.maxEntries) {
      this.logEntries = this.logEntries.slice(-this.maxEntries);
    }

    // Log to console in development
    const consoleMethod = this.getConsoleMethod(entry.level);
    console[consoleMethod](`[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`, entry.context || '');
  }

  public info(message: string, context?: any) {
    this.log('info', message, context);
  }

  public warn(message: string, context?: any) {
    this.log('warn', message, context);
  }

  public error(message: string, context?: any) {
    this.log('error', message, context);
  }

  public debug(message: string, context?: any) {
    this.log('debug', message, context);
  }

  public getEntries(): LogEntry[] {
    return [...this.logEntries];
  }

  public clear() {
    this.logEntries = [];
  }
}

const isProduction = process.env.NODE_ENV === 'production';

// Create a single logger instance
const loggerInstance = new Logger();

// Define the type of LogContext for more organized logging
type LogContext = Record<string, any>;

function createLog(level: LogEntry['level'], message: string, context?: LogContext) {
  const timestamp = new Date().toISOString();
  return {
    timestamp,
    level,
    message,
    context,
  };
}

// Export a single logger instance to be used throughout the app
export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (isProduction) return;
    const logEvent = createLog('debug', message, context);
    console.debug(`[DEBUG] ${message}`, context);
    return logEvent;
  },

  info: (message: string, context?: LogContext) => {
    const logEvent = createLog('info', message, context);
    console.info(`[INFO] ${message}`, context);
    return logEvent;
  },

  warn: (message: string, context?: LogContext) => {
    const logEvent = createLog('warn', message, context);
    console.warn(`[WARN] ${message}`, context);
    return logEvent;
  },

  error: (message: string, context?: LogContext) => {
    const logEvent = createLog('error', message, context);
    console.error(`[ERROR] ${message}`, context);
    return logEvent;
  }
};

export default logger;

// Handle uncaught errors in React components
export const logComponentError = (
  error: Error,
  componentStack: string,
  componentName: string = 'Unknown'
) => {
  logger.error('Uncaught error in component:', {
    error,
    componentStack,
    componentName,
    timestamp: new Date().toISOString(),
    errorCount: (window as any).__ERROR_COUNT = ((window as any).__ERROR_COUNT || 0) + 1,
    userAgent: navigator.userAgent,
    location: window.location.href
  });
};