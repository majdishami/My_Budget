
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { DataProvider } from './contexts/DataContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient();

const root = createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <DataProvider>
        <App />
      </DataProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
