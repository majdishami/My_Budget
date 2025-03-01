import React, { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
import { DataProvider } from "./contexts/DataContext";
import "./index.css";

// Lazy load the main App component
const App = lazy(() => import("./App.jsx")); // Changed to .jsx

// Create root element for React
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Failed to find root element.  Ensure 'root' div exists in your HTML.");
  //Consider a fallback mechanism instead of throwing error here
  //For example, creating a div with ID root 
}

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