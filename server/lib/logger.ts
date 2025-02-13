export const logger = {
  info: (message: string) => {
    console.log(`[INFO] ${message}`);
  },
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${message}`, error?.message || '');
  }
};