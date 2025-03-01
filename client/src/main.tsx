import React, { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
import { DataProvider } from "./contexts/DataContext";
import "./index.css";

// Lazy load the main App component
const App = lazy(() => import("./App"));

// Create root element for React
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find root element");

const root = createRoot(rootElement);

// Initial render
root.render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      <DataProvider>
        <App />
      </DataProvider>
    </Suspense>
  </React.StrictMode>
);