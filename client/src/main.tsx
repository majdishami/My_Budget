
import { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
import { Toaster } from "./components/ui/toaster";
import { DataProvider } from "./contexts/DataContext";
import "./index.css";
import React from "react";

// Extend ImportMeta interface to include hot property
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaHot {
  accept: (path: string, callback: (newApp: any) => void) => void;
}

declare var importMeta: ImportMeta & {
  hot?: ImportMetaHot;
};

// Lazy load the main App component
const App = lazy(() => import("./App"));

// Create root element for React
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find root element");

const root = createRoot(rootElement);

// Enable HMR for App component
if (importMeta.hot) {
  importMeta.hot.accept('./App', (newApp) => {
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

// Initial render
root.render(
  <Suspense fallback={<div>Loading...</div>}>
    <DataProvider>
      <App />
      <Toaster />
    </DataProvider>
  </Suspense>
);
