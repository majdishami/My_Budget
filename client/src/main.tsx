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

// index.js (original file - remains mostly unchanged, except for the import of App)
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';


// index.css (example, needs to be created)
/*body {
  margin: 0;
  font-family: sans-serif;
}*/

//App.js (example, needs to be created)
import React from 'react';

function App() {
  return (
    <div>
      <h1>Hello from App!</h1>
    </div>
  );
}

export default App;

//@/components/ui/toaster.tsx (example, needs to be created)
import React from 'react';

const Toaster = () => {
  return (
    <div>
      {/* Toaster implementation would go here */}
      <p>This is a placeholder toaster</p>
    </div>
  );
};

export default Toaster;