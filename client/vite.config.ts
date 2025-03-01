import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Add JSX runtime for TypeScript files
      jsxRuntime: 'automatic',
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx']
        ]
      }
    })
  ],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: /^@\/(.*)$/, replacement: path.resolve(__dirname, './src/$1') }
    ],
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  server: {
    port: 3001, // Corrected port number
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
  },
  esbuild: {
    loader: 'tsx',
    include: /src\/.*\.[tj]sx?$/,
    exclude: [],
  }
});