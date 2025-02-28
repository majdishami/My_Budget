/**
 * Comprehensive logging utility for the budget tracking application
 * Handles different types of logs with various severity levels
 */

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: any;
  stack?: string;
}

class Logger {
  private logEntries: LogEntry[] = [];
  private maxEntries = 1000;

  private getConsoleMethod(level: string): 'log' | 'warn' | 'error' | 'debug'{
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

export const logger = new Logger();
export const logger = {
  info: (message: string, ...args: any[]) => {
    console.info(`[INFO] ${message}`, ...args)
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args)
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args)
  },
  debug: (message: string, ...args: any[]) => {
    console.debug(`[DEBUG] ${message}`, ...args)
  }
}
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

interface LogEvent {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  stack?: string;
}

const logs: LogEvent[] = [];
const MAX_LOGS = 1000;

const isProduction = process.env.NODE_ENV === 'production';

function createLog(level: LogLevel, message: string, context?: LogContext, error?: Error): LogEvent {
  const logEvent: LogEvent = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context
  };

  if (error && error.stack) {
    logEvent.stack = error.stack;
  }

  logs.push(logEvent);
  
  // Keep logs under the limit
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }

  return logEvent;
}

export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (isProduction) return;
    const logEvent = createLog('debug', message, context);
    console.debug(`[DEBUG] ${message}`, context || '');
    return logEvent;
  },
  
  info: (message: string, context?: LogContext) => {
    const logEvent = createLog('info', message, context);
    console.info(`[INFO] ${message}`, context || '');
    return logEvent;
  },
  
  warn: (message: string, context?: LogContext) => {
    const logEvent = createLog('warn', message, context);
    console.warn(`[WARN] ${message}`, context || '');
    return logEvent;
  },
  
  error: (message: string, context?: LogContext, error?: Error) => {
    const logEvent = createLog('error', message, context, error);
    console.error(`[ERROR] ${message}`, context || '', error || '');
    return logEvent;
  },
  
  getAllLogs: () => [...logs],
  
  downloadLogs: () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `budget-tracker-logs-${new Date().toISOString()}.json`);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
  }
};

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

export default logger;
