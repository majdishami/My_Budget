import { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { DataProvider } from "@/contexts/DataContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./index.css";

// Lazy load the main App component
const App = lazy(() => import("./App"));

// Create root element for React
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find root element");

const root = createRoot(rootElement);

// Enable HMR for App component
if (import.meta.hot) {
  import.meta.hot.accept('./App', (newApp) => {
    if (newApp) {
      // Re-render the app when HMR update is received
      root.render(
        <ErrorBoundary name="RootErrorBoundary">
          <Suspense fallback={<div>Loading...</div>}>
            <DataProvider>
              <App />
              <Toaster />
            </DataProvider>
          </Suspense>
        </ErrorBoundary>
      );
    }
  });
}

// Initial render
root.render(
  <ErrorBoundary name="RootErrorBoundary">
    <Suspense fallback={<div>Loading...</div>}>
      <DataProvider>
        <App />
        <Toaster />
      </DataProvider>
    </Suspense>
  </ErrorBoundary>
);