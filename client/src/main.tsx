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

// Initial render
root.render(
  <Suspense fallback={<div>Loading...</div>}>
    <DataProvider>
      <App />
      <Toaster />
    </DataProvider>
  </Suspense>
);

// Minimal implementations for supporting files (these would ideally be in their own files)
//index.css
/*body {
  margin: 0;
  font-family: sans-serif;
}*/

//App.js
import React from 'react';

function App() {
  return (
    <div>
      <h1>Hello from App!</h1>
    </div>
  );
}

export default App;

//@/components/ui/toaster.tsx
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

//DataContex.tsx (example)
import { createContext, useContext, useState } from 'react';

interface DataContextType {
  data: string;
  setData: (data: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);


export const DataProvider: React.FC = ({children}) => {
  const [data, setData] = useState('');

  return (
    <DataContext.Provider value={{data, setData}}>
      {children}
    </DataContext.Provider>
  )
}

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (context === null) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
}