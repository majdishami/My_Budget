
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: /^@\/(.*)$/, replacement: path.resolve(__dirname, './src/$1') }
    ]
  },
  server: {
    port: 3002,
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
