import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client', 'src'), // Ensures '@/...' aliases work correctly
    },
  },
  root: path.resolve(__dirname, 'client'), // ✅ Root directory set to 'client'
  publicDir: path.resolve(__dirname, 'client', 'public'), // ✅ Ensures static assets (CSS) are included
  server: {
    port: 3005, // ✅ Ensures consistent dev server port
    strictPort: true, // Prevents auto-changing ports
    headers: {
      'Content-Security-Policy': 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline';"
    },
    proxy: {
      '/api': 'http://localhost:3005', // ✅ Ensures backend API is correctly proxied
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'client', 'dist'), // ✅ Ensures correct output structure
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'client', 'index.html'), // ✅ Fixed index.html reference
    },
  },
});
