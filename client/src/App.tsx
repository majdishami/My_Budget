/**
 * ================================================
 * 🚀 Main Application Component
 * ================================================
 */

import { useState, useEffect, useCallback } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Budget } from "@/pages/Budget";
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
import CategoriesPage from "@/pages/Categories";
import NotFound from "@/pages/not-found";

// Types for dialog management
type DialogType = 'monthly-to-date' | 'monthly' | 'date-range' | 'expense' | 'income' | 'annual';

interface ErrorState {
  message: string;
  severity: 'error' | 'warning';
  timeout?: number;
}

interface DialogState {
  [key: string]: boolean;
}

function Router() {
  // Centralized dialog state management
  const [dialogStates, setDialogStates] = useState<DialogState>({
    monthlyToDate: false,
    monthlyReport: false,
    dateRangeReport: false,
    expenseReport: false,
    incomeReport: false,
    annualReport: false,
  });

  const [error, setError] = useState<ErrorState | null>(null);
  const { toast } = useToast();

  // Get data from context and location
  const { bills, incomes, isLoading, error: dataError } = useData();
  const [location, setLocation] = useLocation();

  // Handle data error
  useEffect(() => {
    if (dataError) {
      toast({
        variant: "destructive",
        title: "Data Error",
        description: dataError.message,
      });
    }
  }, [dataError, toast]);

  // Handle error timeout
  useEffect(() => {
    if (error?.timeout) {
      const timer = setTimeout(() => setError(null), error.timeout);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Optimized dialog state management
  const handleDialogOpenChange = useCallback((
    dialogKey: keyof DialogState,
    open: boolean,
    reportType: DialogType
  ) => {
    try {
      setDialogStates(prev => ({ ...prev, [dialogKey]: open }));

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
  }, [setLocation]);

  // Route-based dialog management
  useEffect(() => {
    const routeToDialog: Record<string, { key: keyof DialogState; type: DialogType }> = {
      '/reports/monthly-to-date': { key: 'monthlyToDate', type: 'monthly-to-date' },
      '/reports/monthly': { key: 'monthlyReport', type: 'monthly' },
      '/reports/date-range': { key: 'dateRangeReport', type: 'date-range' },
      '/reports/expenses': { key: 'expenseReport', type: 'expense' },
      '/reports/income': { key: 'incomeReport', type: 'income' },
      '/reports/annual': { key: 'annualReport', type: 'annual' },
    };

    const dialogInfo = routeToDialog[location];
    if (dialogInfo) {
      try {
        // Reset all dialogs
        const resetDialogs = Object.keys(dialogStates).reduce(
          (acc, key) => ({ ...acc, [key]: false }), {}
        );

        // Set the active dialog
        setDialogStates({ ...resetDialogs, [dialogInfo.key]: true });
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

      <Switch>
        <Route path="/" component={Budget} />
        <Route path="/categories" component={CategoriesPage} />
        <Route path="/reports/:type" component={NotFound} />
        <Route component={NotFound} />
      </Switch>

      <MonthlyToDateDialog
        isOpen={dialogStates.monthlyToDate}
        onOpenChange={(open) => handleDialogOpenChange('monthlyToDate', open, 'monthly-to-date')}
      />
      <MonthlyReportDialog
        isOpen={dialogStates.monthlyReport}
        onOpenChange={(open) => handleDialogOpenChange('monthlyReport', open, 'monthly')}
      />
      <DateRangeReportDialog
        isOpen={dialogStates.dateRangeReport}
        onOpenChange={(open) => handleDialogOpenChange('dateRangeReport', open, 'date-range')}
      />
      <ExpenseReportDialog
        isOpen={dialogStates.expenseReport}
        onOpenChange={(open) => handleDialogOpenChange('expenseReport', open, 'expense')}
        bills={bills}
      />
      <IncomeReportDialog
        isOpen={dialogStates.incomeReport}
        onOpenChange={(open) => handleDialogOpenChange('incomeReport', open, 'income')}
        incomes={incomes}
      />
      <AnnualReportDialog
        isOpen={dialogStates.annualReport}
        onOpenChange={(open) => handleDialogOpenChange('annualReport', open, 'annual')}
      />
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