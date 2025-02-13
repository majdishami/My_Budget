export const logger = {
  info: (message: string, data?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`, data ? data : '');
  },
  error: (message: string, data?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, data ? data : '');
  },
  warn: (message: string, data?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN: ${message}`, data ? data : '');
  },
  debug: (message: string, data?: Record<string, any>) => {
    if (process.env.NODE_ENV !== 'production') {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] DEBUG: ${message}`, data ? data : '');
    }
  }
};
