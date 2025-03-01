
import { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
import { Toaster } from "./components/ui/toaster";
import { DataProvider } from "./contexts/DataContext";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import React from "react";

// Lazy load components for code splitting
const App = lazy(() => import("./App"));
const CategoriesPage = lazy(() => import("./pages/Categories"));
const ReportsPage = lazy(() => import("./pages/Reports"));
const SettingsPage = lazy(() => import("./pages/Settings"));

// Create root element for React
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find root element");

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading application...</div>}>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/main" element={<App />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/" element={<Navigate to="/main" replace />} />
            <Route path="*" element={<Navigate to="/main" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </DataProvider>
    </Suspense>
  </React.StrictMode>
);
