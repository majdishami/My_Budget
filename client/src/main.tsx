
import React from "react";
import { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
import { Router, Route, Switch } from "wouter";
import { Toaster } from "./components/ui/toaster";
import { DataProvider } from "./contexts/DataContext";
import "./index.css";

// Lazy load components
const App = lazy(() => import("./App"));
const CategoriesPage = lazy(() => import("./pages/Categories"));

// Create root element for React
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find root element");

const root = createRoot(rootElement);

// Initial render
root.render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading application...</div>}>
      <DataProvider>
        <Router base="">
          <Route path="/">
            <App />
          </Route>
          <Route path="/main">
            <App />
          </Route>
          <Route path="/categories">
            <CategoriesPage />
          </Route>
          <Route path="*">
            <App />
          </Route>
        </Router>
        <Toaster />
      </DataProvider>
    </Suspense>
  </React.StrictMode>
);
