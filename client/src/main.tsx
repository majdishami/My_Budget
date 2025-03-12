console.log("✅ Main.tsx Loaded");
import "./styles.css";
import { createRoot } from "react-dom/client";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { DataProvider } from "@/contexts/DataContext";
import App from "./App"; // Ensure App component is included
import "./index.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <Suspense fallback={<div>Loading...</div>}>
    <DataProvider>
      <Toaster />
      <App />
    </DataProvider>
  </Suspense>
);
