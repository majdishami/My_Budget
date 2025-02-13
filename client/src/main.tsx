import { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
import { DataProvider } from "@/contexts/DataContext";
import "./index.css";

// Error handling for initialization
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Failed to find root element");
  throw new Error("Failed to find root element");
}

try {
  const root = createRoot(rootElement);
  const App = lazy(() => import("./App"));

  root.render(
    <DataProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <App />
      </Suspense>
    </DataProvider>
  );
} catch (error) {
  console.error("Failed to initialize app:", error);
  rootElement.innerHTML = "Failed to load application. Please try refreshing the page.";
}