/**
 * ================================================
 * 🚀 Main Application Component
 * ================================================
 */

import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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
import { X } from "lucide-react";

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

  // Get data from context and location
  const { bills, incomes } = useData();
  const [location, setLocation] = useLocation();

  // Clear error after timeout if specified
  useEffect(() => {
    if (error?.timeout) {
      const timer = setTimeout(() => {
        setError(null);
      }, error.timeout);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Generic dialog handler with enhanced error handling
  const handleDialogOpenChange = (
    dialogSetter: React.Dispatch<React.SetStateAction<boolean>>,
    open: boolean,
    dialogType: DialogType
  ) => {
    try {
      dialogSetter(open);
      if (!open) {
        setLocation('/');
      }
      logger.info(`${dialogType} dialog state changed`, { open });
      setError(null); // Clear any previous errors
    } catch (err) {
      const error = err as Error;
      const errorMessage = `Failed to ${open ? 'open' : 'close'} ${dialogType} report`;
      logger.error(`Error handling ${dialogType} dialog`, { error });

      setError({
        message: `${errorMessage}: ${error.message}`,
        severity: 'error',
        timeout: 5000 // Auto-dismiss after 5 seconds for non-critical errors
      });
    }
  };

  // Use effects to handle route-based dialog states
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
        handler();
      } catch (err) {
        const error = err as Error;
        setError({
          message: `Failed to handle route change: ${error.message}`,
          severity: 'error'
        });
      }
    }
  }, [location]);

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
          {() => null} {/* Routes now handled by useEffect */}
        </Route>
      </Switch>

      {/* 📈 Report Dialogs */}
      <MonthlyToDateDialog
        isOpen={showMonthlyToDate}
        onOpenChange={(open) => handleDialogOpenChange(setShowMonthlyToDate, open, 'monthly-to-date')}
      />
      <MonthlyReportDialog
        isOpen={showMonthlyReport}
        onOpenChange={(open) => handleDialogOpenChange(setShowMonthlyReport, open, 'monthly')}
      />
      <DateRangeReportDialog
        isOpen={showDateRangeReport}
        onOpenChange={(open) => handleDialogOpenChange(setShowDateRangeReport, open, 'date-range')}
      />
      <ExpenseReportDialog
        isOpen={showExpenseReport}
        onOpenChange={(open) => handleDialogOpenChange(setShowExpenseReport, open, 'expense')}
        bills={bills}
      />
      <IncomeReportDialog
        isOpen={showIncomeReport}
        onOpenChange={(open) => handleDialogOpenChange(setShowIncomeReport, open, 'income')}
        incomes={incomes}
      />
      <AnnualReportDialog
        isOpen={showAnnualReport}
        onOpenChange={(open) => handleDialogOpenChange(setShowAnnualReport, open, 'annual')}
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