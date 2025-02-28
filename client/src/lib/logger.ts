
// Types
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

// Define the type of LogContext for more organized logging
export interface LogContext {
  [key: string]: any;
}

// Global log storage
let logs: LogEntry[] = [];
const MAX_LOGS = 1000;

// Configuration
let enableConsoleOutput = true;
let minLevel: LogLevel = 'info'; // Default minimum level

// Create a log entry
function createLog(level: LogEntry['level'], message: string, context?: LogContext) {
  const timestamp = new Date().toISOString();
  
  // Create log entry
  const logEntry: LogEntry = {
    timestamp,
    level,
    message,
    context
  };
  
  // Add to memory logs
  logs.push(logEntry);
  
  // Trim logs if they exceed maximum
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(-MAX_LOGS);
  }
  
  // Log to console if enabled
  if (enableConsoleOutput) {
    const contextString = context ? ` ${JSON.stringify(context)}` : '';
    
    switch (level) {
      case 'debug':
        console.debug(`[${timestamp}] ${message}${contextString}`);
        break;
      case 'info':
        console.info(`[${timestamp}] ${message}${contextString}`);
        break;
      case 'warn':
        console.warn(`[${timestamp}] ${message}${contextString}`);
        break;
      case 'error':
        console.error(`[${timestamp}] ${message}${contextString}`);
        break;
    }
  }
  
  return logEntry;
}

// Level-specific log methods
function debug(message: string, context?: LogContext) {
  if (shouldLog('debug')) {
    return createLog('debug', message, context);
  }
}

function info(message: string, context?: LogContext) {
  if (shouldLog('info')) {
    return createLog('info', message, context);
  }
}

function warn(message: string, context?: LogContext) {
  if (shouldLog('warn')) {
    return createLog('warn', message, context);
  }
}

function error(message: string, context?: LogContext) {
  if (shouldLog('error')) {
    return createLog('error', message, context);
  }
}

// Helper to determine if we should log based on level
function shouldLog(level: LogLevel): boolean {
  const levelOrder: Record<LogLevel, number> = {
    'debug': 0,
    'info': 1,
    'warn': 2,
    'error': 3
  };
  
  return levelOrder[level] >= levelOrder[minLevel];
}

// Configuration methods
function configure(options: {
  consoleOutput?: boolean;
  level?: LogLevel;
}) {
  if (options.consoleOutput !== undefined) {
    enableConsoleOutput = options.consoleOutput;
  }
  
  if (options.level) {
    minLevel = options.level;
  }
}

// Retrieve logs
function getLogs(): LogEntry[] {
  return [...logs];
}

// Clear logs
function clearLogs(): void {
  logs = [];
}

// Export logs to JSON
function exportLogs(): string {
  return JSON.stringify(logs, null, 2);
}

// Download logs as a file
function downloadLogs(filename: string = `budget-tracker-logs-${new Date().toISOString()}.json`): void {
  const logsJson = exportLogs();
  const blob = new Blob([logsJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Create the logger object
const logger = {
  debug,
  info,
  warn,
  error,
  configure,
  getLogs,
  clearLogs,
  exportLogs,
  downloadLogs
};

export default logger;
