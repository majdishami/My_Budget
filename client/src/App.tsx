/**
 * ================================================
 * 🚀 Main Application Component
 * ================================================
 */

import { Switch, Route } from "wouter";
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
import { useLocation } from "wouter";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { logger } from "@/lib/logger";
import { ThemeToggle } from "@/components/ThemeToggle"; 
import { useData } from "@/contexts/DataContext";

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

  // Get data from context
  const { bills, incomes } = useData();
  const [, setLocation] = useLocation();

  /**
   * 🔄 Dialog Management Functions
   */
  const handleMonthlyToDateOpenChange = (open: boolean) => {
    try {
      setShowMonthlyToDate(open);
      if (!open) setLocation('/');
      logger.info('Monthly-to-date dialog state changed', { open });
    } catch (error) {
      logger.error('Error handling monthly-to-date dialog', { error });
    }
  };

  const handleMonthlyReportOpenChange = (open: boolean) => {
    try {
      setShowMonthlyReport(open);
      if (!open) setLocation('/');
      logger.info('Monthly report dialog state changed', { open });
    } catch (error) {
      logger.error('Error handling monthly report dialog', { error });
    }
  };

  const handleDateRangeReportOpenChange = (open: boolean) => {
    try {
      setShowDateRangeReport(open);
      if (!open) setLocation('/');
      logger.info('Date range report dialog state changed', { open });
    } catch (error) {
      logger.error('Error handling date range report dialog', { error });
    }
  };

  const handleExpenseReportOpenChange = (open: boolean) => {
    try {
      setShowExpenseReport(open);
      if (!open) setLocation('/');
      logger.info('Expense report dialog state changed', { open });
    } catch (error) {
      logger.error('Error handling expense report dialog', { error });
    }
  };

  const handleIncomeReportOpenChange = (open: boolean) => {
    try {
      setShowIncomeReport(open);
      if (!open) setLocation('/');
      logger.info('Income report dialog state changed', { open });
    } catch (error) {
      logger.error('Error handling income report dialog', { error });
    }
  };

  const handleAnnualReportOpenChange = (open: boolean) => {
    try {
      setShowAnnualReport(open);
      if (!open) setLocation('/');
      logger.info('Annual report dialog state changed', { open });
    } catch (error) {
      logger.error('Error handling annual report dialog', { error });
    }
  };

  return (
    <ErrorBoundary>
      {/* 🛣️ Route Configuration */}
      <Switch>
        <Route path="/" component={Budget} />
        {/* 📊 Report Routes */}
        <Route path="/reports/monthly-to-date">
          {() => {
            setShowMonthlyToDate(true);
            return null;
          }}
        </Route>
        <Route path="/reports/monthly">
          {() => {
            setShowMonthlyReport(true);
            return null;
          }}
        </Route>
        <Route path="/reports/date-range">
          {() => {
            setShowDateRangeReport(true);
            return null;
          }}
        </Route>
        <Route path="/reports/expenses">
          {() => {
            setShowExpenseReport(true);
            return null;
          }}
        </Route>
        <Route path="/reports/income">
          {() => {
            setShowIncomeReport(true);
            return null;
          }}
        </Route>
        <Route path="/reports/annual">
          {() => {
            setShowAnnualReport(true);
            return null;
          }}
        </Route>
      </Switch>

      {/* 📈 Report Dialogs */}
      <MonthlyToDateDialog
        isOpen={showMonthlyToDate}
        onOpenChange={handleMonthlyToDateOpenChange}
      />
      <MonthlyReportDialog
        isOpen={showMonthlyReport}
        onOpenChange={handleMonthlyReportOpenChange}
      />
      <DateRangeReportDialog
        isOpen={showDateRangeReport}
        onOpenChange={handleDateRangeReportOpenChange}
      />
      <ExpenseReportDialog
        isOpen={showExpenseReport}
        onOpenChange={handleExpenseReportOpenChange}
        bills={bills}
      />
      <IncomeReportDialog
        isOpen={showIncomeReport}
        onOpenChange={handleIncomeReportOpenChange}
        incomes={incomes}
      />
      <AnnualReportDialog
        isOpen={showAnnualReport}
        onOpenChange={handleAnnualReportOpenChange}
      />
    </ErrorBoundary>
  );
}

/**
 * 🎯 Main App Component
 */
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;