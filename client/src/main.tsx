import React from "react";
import { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import { DataProvider } from "./contexts/DataContext";
import "./index.css";

// Lazy load components for better performance
const App = lazy(() => import("./App"));
const CategoriesPage = lazy(() => import("./pages/Categories"));
const ReportsPage = lazy(() => import("./pages/reports"));
const SettingsPage = lazy(() => import("./pages/Settings"));

// Create root element for React
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find root element");

const root = createRoot(rootElement);

// Initial render with proper routing
root.render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </DataProvider>
    </Suspense>
  </React.StrictMode>
);