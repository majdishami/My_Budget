
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'components': path.resolve(__dirname, './src/components'),
      'lib': path.resolve(__dirname, './src/lib'),
      'hooks': path.resolve(__dirname, './src/hooks')
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
