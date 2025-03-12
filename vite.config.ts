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
  root: path.resolve(__dirname, 'client'), // Root directory set to 'client'
  server: {
    port: 3005, // Ensures consistent dev server port
    strictPort: true, // Prevents auto-changing ports
  },
  build: {
    outDir: path.resolve(__dirname, 'client', 'dist', 'public'), // Ensures correct output structure
    emptyOutDir: true,
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    },
  },
});
