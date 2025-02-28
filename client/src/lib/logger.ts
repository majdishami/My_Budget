const DEBUG = process.env.NODE_ENV !== 'production';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
}

// Keep a log history for debugging purposes
const logHistory: LogEntry[] = [];
const MAX_LOG_HISTORY = 100;

// Allow logs to be exported for debugging
export function downloadLogs(): string {
  return JSON.stringify(logHistory, null, 2);
}

function addToHistory(entry: LogEntry) {
  logHistory.push(entry);
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory.shift();
  }
}

function createLogEntry(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context
  };
}

function log(level: LogLevel, message: string, context?: Record<string, any>) {
  const entry = createLogEntry(level, message, context);
  addToHistory(entry);

  // In development, also log to console
  if (DEBUG) {
    const consoleMethod = level === 'debug' ? 'log' : level;
    if (context) {
      const method = console[consoleMethod as keyof Console];
      if (typeof method === 'function') {
        method(`[${entry.timestamp}] [${level.toUpperCase()}] ${message}`, context);
      }
    } else {
      const method = console[consoleMethod as keyof Console];
      if (typeof method === 'function') {
        method(`[${entry.timestamp}] [${level.toUpperCase()}] ${message}`);
      }
    }
  }

  return entry;
}

// Export both object form and standalone functions
const logger = {
  debug: (message: string, context?: Record<string, any>) => log('debug', message, context),
  info: (message: string, context?: Record<string, any>) => log('info', message, context),
  warn: (message: string, context?: Record<string, any>) => log('warn', message, context),
  error: (message: string, context?: Record<string, any>) => log('error', message, context),
  downloadLogs,
  getHistory: () => [...logHistory]
};

export default logger;