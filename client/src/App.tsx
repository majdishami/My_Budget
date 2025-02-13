/**
 * ================================================
 * 🚀 Main Application Component
 * ================================================
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function Router() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <h1>Budget Tracker</h1>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary
        name="RootErrorBoundary"
        onReset={() => {
          queryClient.clear();
          window.location.reload();
        }}
      >
        <Router />
        <Toaster />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;