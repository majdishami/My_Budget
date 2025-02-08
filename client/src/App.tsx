/**
 * ================================================
 * 🚀 Main Application Component
 * ================================================
 */

import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import Budget from "@/pages/Budget";
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import MonthlyToDateDialog from "@/components/MonthlyToDateDialog";
import MonthlyReportDialog from "@/components/MonthlyReportDialog";
import DateRangeReportDialog from "@/components/DateRangeReportDialog";
import ExpenseReportDialog from "@/components/ExpenseReportDialog";
import IncomeReportDialog from "@/components/IncomeReportDialog";
import AnnualReportDialog from "@/components/AnnualReportDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { logger } from "@/lib/logger";
import { ThemeToggle } from "@/components/ThemeToggle"; 
import { useData } from "@/contexts/DataContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, X } from "lucide-react";

type DialogType = 'monthly-to-date' | 'monthly' | 'date-range' | 'expense' | 'income' | 'annual';

interface ErrorState {
  message: string;
  severity: 'error' | 'warning';
  timeout?: number;
}

/**
 * 🛣️ Router Component
 * Manages application routing and dialog states
 */
function Router() {
  // 📊 Report Dialog States
  const [showMonthlyToDate, setShowMonthlyToDate] = useState(false);
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);
  const [showDateRangeReport, setShowDateRangeReport] = useState(false);
  const [showExpenseReport, setShowExpenseReport] = useState(false);
  const [showIncomeReport, setShowIncomeReport] = useState(false);
  const [showAnnualReport, setShowAnnualReport] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const { toast } = useToast();

  // Get data from context and location
  const { bills, incomes, isLoading, error: dataError } = useData();
  const [location, setLocation] = useLocation();

  // Show data error toast
  useEffect(() => {
    if (dataError) {
      toast({
        variant: "destructive",
        title: "Data Error",
        description: dataError.message,
      });
    }
  }, [dataError, toast]);

  // Clear error after timeout if specified
  useEffect(() => {
    if (error?.timeout) {
      const timer = setTimeout(() => {
        setError(null);
      }, error.timeout);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleDialogOpenChange = (
    dialogSetter: React.Dispatch<React.SetStateAction<boolean>>,
    open: boolean,
    reportType: string
  ) => {
    try {
      dialogSetter(open);
      if (!open) {
        setLocation('/', { replace: true });
      }
      logger.info(`${reportType} dialog state changed`, { open });
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      logger.error(`Error handling ${reportType} dialog`, { error });
      setError({
        message: `Failed to ${open ? 'open' : 'close'} ${reportType} report: ${error.message}`,
        severity: 'error',
        timeout: 5000
      });
    }
  };

  // Enhanced route handling with better error management
  useEffect(() => {
    const dialogStates: Record<string, () => void> = {
      '/reports/monthly-to-date': () => setShowMonthlyToDate(true),
      '/reports/monthly': () => setShowMonthlyReport(true),
      '/reports/date-range': () => setShowDateRangeReport(true),
      '/reports/expenses': () => setShowExpenseReport(true),
      '/reports/income': () => setShowIncomeReport(true),
      '/reports/annual': () => setShowAnnualReport(true),
    };

    const handler = dialogStates[location];
    if (handler) {
      try {
        // Reset all dialogs first
        Object.keys(dialogStates).forEach(() => {
          setShowMonthlyToDate(false);
          setShowMonthlyReport(false);
          setShowDateRangeReport(false);
          setShowExpenseReport(false);
          setShowIncomeReport(false);
          setShowAnnualReport(false);
        });

        handler();
        logger.info('Route changed successfully', { location });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        logger.error('Failed to handle route change', { error, location });
        setError({
          message: `Failed to handle route change: ${error.message}`,
          severity: 'error',
          timeout: 5000
        });
        setLocation('/', { replace: true });
      }
    }
  }, [location, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {/* Error Alert */}
      {error && (
        <Alert 
          variant={error.severity === 'error' ? "destructive" : "default"}
          className="fixed top-4 right-4 w-auto z-50 animate-in fade-in slide-in-from-top-2"
          role="alert"
        >
          <AlertDescription className="flex items-center gap-2">
            {error.message}
            <button 
              onClick={() => setError(null)}
              className="p-1 hover:bg-accent rounded"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* 🛣️ Route Configuration */}
      <Switch>
        <Route path="/" component={Budget} />
        <Route path="/reports/:type">
          {() => null /* Dialog handling is done via useEffect */}
        </Route>
        <Route>
          {/* 404 Route */}
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">404</h1>
              <p className="mb-4">Page not found</p>
              <button 
                onClick={() => setLocation('/')}
                className="text-primary hover:underline"
              >
                Go back home
              </button>
            </div>
          </div>
        </Route>
      </Switch>

      {/* 📈 Report Dialogs */}
      <MonthlyToDateDialog
        isOpen={showMonthlyToDate}
        onOpenChange={(open) => handleDialogOpenChange(setShowMonthlyToDate, open, "Monthly-to-date")}
      />
      <MonthlyReportDialog
        isOpen={showMonthlyReport}
        onOpenChange={(open) => handleDialogOpenChange(setShowMonthlyReport, open, "Monthly")}
      />
      <DateRangeReportDialog
        isOpen={showDateRangeReport}
        onOpenChange={(open) => handleDialogOpenChange(setShowDateRangeReport, open, "Date Range")}
      />
      <ExpenseReportDialog
        isOpen={showExpenseReport}
        onOpenChange={(open) => handleDialogOpenChange(setShowExpenseReport, open, "Expense")}
        bills={bills}
      />
      <IncomeReportDialog
        isOpen={showIncomeReport}
        onOpenChange={(open) => handleDialogOpenChange(setShowIncomeReport, open, "Income")}
        incomes={incomes}
      />
      <AnnualReportDialog
        isOpen={showAnnualReport}
        onOpenChange={(open) => handleDialogOpenChange(setShowAnnualReport, open, "Annual")}
      />
    </ErrorBoundary>
  );
}

/**
 * 🎯 Main App Component
 */
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