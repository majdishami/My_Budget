/**
 * ================================================
 * 🚀 Main Application Component
 * ================================================
 */

import { useState, useEffect, useMemo } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Budget } from "@/pages/Budget";
import dayjs from 'dayjs';
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useData } from "@/contexts/DataContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, X } from "lucide-react";
import CategoriesPage from "@/pages/Categories";
import NotFound from "@/pages/not-found";
import MonthlyToDateReport from "@/pages/monthly-to-date";
import MonthlyReport from "@/pages/monthly";
import AnnualReport from "@/pages/annual";
import DateRangeReport from "@/pages/date-range";
import IncomeReport from "@/pages/income";
import ExpenseReport from "@/pages/expenses";

function Router() {
  const { isLoading, error: dataError } = useData();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {dataError && (
        <Alert
          variant="destructive"
          className="fixed top-4 right-4 w-auto z-50 animate-in fade-in slide-in-from-top-2"
          role="alert"
        >
          <AlertDescription className="flex items-center gap-2">
            {dataError.message}
            <button
              className="p-1 hover:bg-accent rounded"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      <Switch>
        <Route path="/" component={Budget} />
        <Route path="/categories" component={CategoriesPage} />
        <Route path="/reports/monthly-to-date" component={MonthlyToDateReport} />
        <Route path="/reports/monthly" component={MonthlyReport} />
        <Route path="/reports/annual" component={AnnualReport} />
        <Route path="/reports/date-range" component={DateRangeReport} />
        <Route path="/reports/income" component={IncomeReport} />
        <Route path="/reports/expenses" component={ExpenseReport} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Router />
        <Toaster />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;