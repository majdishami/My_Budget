// Simple logger module for debugging/tracing

const logLevels = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

type LogLevel = keyof typeof logLevels;

// Configure current log level from environment or default to INFO
const currentLevel = import.meta.env.VITE_LOG_LEVEL as LogLevel || "INFO";

const logger = {
  debug: (message: string, ...args: any[]) => {
    if (logLevels[currentLevel] <= logLevels.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },

  info: (message: string, ...args: any[]) => {
    if (logLevels[currentLevel] <= logLevels.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: any[]) => {
    if (logLevels[currentLevel] <= logLevels.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  error: (message: string | Error, ...args: any[]) => {
    if (logLevels[currentLevel] <= logLevels.ERROR) {
      const errorMsg = message instanceof Error ? 
        `${message.message}\n${message.stack}` : message;
      console.error(`[ERROR] ${errorMsg}`, ...args);
    }
  },

  // Log any type of event with custom level
  log: (level: LogLevel, message: string, ...args: any[]) => {
    if (logLevels[currentLevel] <= logLevels[level]) {
      console.log(`[${level}] ${message}`, ...args);
    }
  },
};

export default logger;