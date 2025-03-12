import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  root: __dirname, // ✅ Ensures Vite correctly finds `index.html`
  publicDir: 'public', // ✅ Ensures Vite serves static files like styles.css
  server: {
    port: 3005, // 🔥 Changed from 4173 → 3005
    strictPort: true,
    headers: {
      'Content-Type': 'text/css', // ✅ Forces correct MIME type for `styles.css`
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'), // ✅ Ensures Vite finds `index.html`
      output: {
        assetFileNames: "assets/[name].[ext]", // ✅ Prevents CSS renaming
      },
    },
  },
});
