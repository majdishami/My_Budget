import { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { DataProvider } from "@/contexts/DataContext";
import "./index.css";

// Lazy load the main App component
const App = lazy(() => import("./App"));

// Create root element for React
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find root element");

const root = createRoot(rootElement);

// More graceful service worker registration that works better with Safari
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });

      console.log('ServiceWorker registration successful:', registration.scope);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                const updateConfirm = window.confirm('New version available! Click OK to refresh.');
                if (updateConfirm) window.location.reload();
              }
            }
          });
        }
      });
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
    }
  });
}

// Enable HMR for App component
if (import.meta.hot) {
  import.meta.hot.accept('./App', (newApp) => {
    if (newApp) {
      // Re-render the app when HMR update is received
      root.render(
        <Suspense fallback={<div>Loading...</div>}>
          <DataProvider>
            <App />
            <Toaster />
          </DataProvider>
        </Suspense>
      );
    }
  });
}

// Initial render with error boundary and suspense
root.render(
  <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
    <DataProvider>
      <App />
      <Toaster />
    </DataProvider>
  </Suspense>
);