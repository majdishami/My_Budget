
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    host: '0.0.0.0',
    strictPort: true,
    hmr: {
      // Use Replit's proxy for WebSocket connections
      clientPort: 443,
      host: undefined,
    },
  },
  build: {
    outDir: 'build'
  }
});
