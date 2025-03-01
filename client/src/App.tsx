
import React, { Suspense } from 'react';
import { Router, Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/toaster';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// Lazy load pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const ExpenseReportPage = React.lazy(() => import('./pages/expenses'));
const Settings = React.lazy(() => import('./pages/Settings'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Data Provider Component
const DataProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

function App() {
  return (
    <DataProvider>
      <ErrorBoundary>
        <Router>
          <div className="app-container">
            <main className="content">
              <ErrorBoundary>
                <Suspense fallback={<div>Loading...</div>}>
                  <Switch>
                    <Route path="/" component={Dashboard} />
                    <Route path="/reports/expenses" component={ExpenseReportPage} />
                    <Route path="/settings" component={Settings} />
                    <Route component={NotFound} />
                  </Switch>
                </Suspense>
              </ErrorBoundary>
            </main>
          </div>
        </Router>
      </ErrorBoundary>
      <Toaster />
    </DataProvider>
  );
}

export default App;
