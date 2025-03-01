import React from "react";
import { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
import { Router } from "wouter";
import { Toaster } from "./components/ui/toaster";
import { DataProvider } from "./contexts/DataContext";
import "./index.css";

// Lazy load the main App component with absolute import
const App = lazy(() => import("./App"));

// Create root element for React
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Failed to find root element");
  // Create a root element if it doesn't exist
  const newRoot = document.createElement("div");
  newRoot.id = "root";
  document.body.appendChild(newRoot);
}

const root = createRoot(rootElement || document.getElementById("root")!);

// Initial render
root.render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      <DataProvider>
        <Router base="">
          <App />
          <Toaster />
        </Router>
      </DataProvider>
    </Suspense>
  </React.StrictMode>
);