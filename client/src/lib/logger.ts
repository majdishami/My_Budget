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
