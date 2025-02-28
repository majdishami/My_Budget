import { saveAs } from 'file-saver';

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "NONE";

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  stack?: string;
};

// In-memory log storage
const logEntries: LogEntry[] = [];

// Configure current log level from environment or default to INFO
const currentLevel = "INFO";

const logger = {
  debug: (message: string, ...args: any[]) => {
    if (isLevelEnabled("DEBUG")) {
      log("DEBUG", message, args);
    }
  },

  info: (message: string, ...args: any[]) => {
    if (isLevelEnabled("INFO")) {
      log("INFO", message, args);
    }
  },

  warn: (message: string, ...args: any[]) => {
    if (isLevelEnabled("WARN")) {
      log("WARN", message, args);
    }
  },

  error: (message: string, error?: any, context?: Record<string, any>) => {
    if (isLevelEnabled("ERROR")) {
      const formattedError = error instanceof Error ? error : new Error(JSON.stringify(error));
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: "ERROR",
        message,
        context: {
          ...(context || {}),
          error: formatError(formattedError),
        },
      };

      if (formattedError?.stack) {
        entry.stack = formattedError.stack;
      }

      logEntries.push(entry);
      console.error(message, formattedError, context);
    }
  },

  // Record a React component error
  componentError: (error: Error, componentStack: string, componentName: string) => {
    if (isLevelEnabled("ERROR")) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: "ERROR",
        message: "Uncaught error in component:",
        context: {
          error: formatError(error),
          componentStack,
          componentName,
          timestamp: new Date().toISOString(),
          errorCount: getErrorCount() + 1,
          userAgent: navigator.userAgent,
          location: window.location.href
        },
        stack: error.stack || ""
      };

      logEntries.push(entry);
      console.error("Component Error:", error, componentStack);
    }
  },

  // Get all logs
  getLogs: () => {
    return [...logEntries];
  },

  // Clear logs
  clearLogs: () => {
    logEntries.length = 0;
  },

  // Download logs as JSON file
  downloadLogs: () => {
    const blob = new Blob([JSON.stringify(logEntries, null, 2)], { 
      type: 'application/json' 
    });

    const filename = `budget-tracker-logs-${new Date().toISOString().replace(/:/g, '_')}.json`;
    saveAs(blob, filename);
  }
};

// Helper function to check if a log level is enabled
function isLevelEnabled(level: LogLevel): boolean {
  const levels: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR", "NONE"];
  const currentLevelIndex = levels.indexOf(currentLevel);
  const targetLevelIndex = levels.indexOf(level);

  return targetLevelIndex >= currentLevelIndex;
}

// Log a message with the specified level
function log(level: LogLevel, message: string, args: any[]) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: args.length > 0 ? { args } : undefined
  };

  logEntries.push(entry);

  switch (level) {
    case "DEBUG":
      console.debug(message, ...args);
      break;
    case "INFO":
      console.info(message, ...args);
      break;
    case "WARN":
      console.warn(message, ...args);
      break;
    case "ERROR":
      console.error(message, ...args);
      break;
  }
}

// Format an error object to be JSON-serializable
function formatError(error: Error): Record<string, any> {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack
  };
}

// Get current error count
function getErrorCount(): number {
  return logEntries.filter(entry => entry.level === "ERROR").length;
}

export default logger;