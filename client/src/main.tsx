import { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
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
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#fff'
      }}>
        Loading...
      </div>
    }>
      <App />
    </Suspense>
  );
} catch (error) {
  console.error("Failed to initialize app:", error);
  if (rootElement) {
    rootElement.innerHTML = "Failed to load application. Please try refreshing the page.";
  }
}