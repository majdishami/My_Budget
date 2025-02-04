/**
 * ================================================
 * 🚀 Main Application Component
 * ================================================
 * Manages routing, global state, and dialog components
 * for the budget tracking application.
 * 
 * Core Responsibilities:
 * - Route configuration
 * - Global state management
 * - Dialog coordination
 * - Initial data setup
 * - Error handling and logging
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

/**
 * 📊 Data Interfaces
 * Define core data structures for the application
 */
interface Income {
  id: string;
  source: string;
  amount: number;
  date: string;
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  day: number;
}

/**
 * 🛣️ Router Component
 * Handles route management and dialog state
 */
function Router() {
  // 📊 Report Dialog States
  const [showMonthlyToDate, setShowMonthlyToDate] = useState(false);
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);
  const [showDateRangeReport, setShowDateRangeReport] = useState(false);
  const [showExpenseReport, setShowExpenseReport] = useState(false);
  const [showIncomeReport, setShowIncomeReport] = useState(false);
  const [showAnnualReport, setShowAnnualReport] = useState(false);

  // 🧭 Navigation Control
  const [, setLocation] = useLocation();
  const [bills, setBills] = useState<Bill[]>([]);

  /**
   * 📋 Load Initial Bill Data
   * Retrieves stored bills on component mount
   */
  useEffect(() => {
    try {
      const storedBills = localStorage.getItem("bills");
      if (storedBills) {
        const parsedBills = JSON.parse(storedBills);
        setBills(parsedBills);
        logger.info('Bills loaded successfully', { count: parsedBills.length });
      }
    } catch (error) {
      logger.error('Failed to load bills from localStorage', { error });
    }
  }, []);

  /**
   * 🔄 Dialog Management Functions
   * Handle opening/closing of report dialogs and navigation
   */
  const handleMonthlyToDateOpenChange = (open: boolean) => {
    try {
      setShowMonthlyToDate(open);
      if (!open) {
        setLocation('/');
      }
      logger.info('Monthly-to-date dialog state changed', { open });
    } catch (error) {
      logger.error('Error handling monthly-to-date dialog', { error });
    }
  };

  const handleMonthlyReportOpenChange = (open: boolean) => {
    try {
      setShowMonthlyReport(open);
      if (!open) {
        setLocation('/');
      }
      logger.info('Monthly report dialog state changed', { open });
    } catch (error) {
      logger.error('Error handling monthly report dialog', { error });
    }
  };

  const handleDateRangeReportOpenChange = (open: boolean) => {
    try {
      setShowDateRangeReport(open);
      if (!open) {
        setLocation('/');
      }
      logger.info('Date range report dialog state changed', { open });
    } catch (error) {
      logger.error('Error handling date range report dialog', { error });
    }
  };

  const handleExpenseReportOpenChange = (open: boolean) => {
    try {
      setShowExpenseReport(open);
      if (!open) {
        setLocation('/');
      }
      logger.info('Expense report dialog state changed', { open });
    } catch (error) {
      logger.error('Error handling expense report dialog', { error });
    }
  };

  const handleIncomeReportOpenChange = (open: boolean) => {
    try {
      setShowIncomeReport(open);
      if (!open) {
        setLocation('/');
      }
      logger.info('Income report dialog state changed', { open });
    } catch (error) {
      logger.error('Error handling income report dialog', { error });
    }
  };

  const handleAnnualReportOpenChange = (open: boolean) => {
    try {
      setShowAnnualReport(open);
      if (!open) {
        setLocation('/');
      }
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
 * Provides global configuration and initial data setup
 */
function App() {
  // 💰 Global Financial Data State
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  /**
   * 🔄 Initialize Default Data
   * Sets up initial income and expense data with default values
   * starting from January 1st, 2025
   */
  useEffect(() => {
    try {
      // Clear existing data first
      localStorage.removeItem("incomes");
      localStorage.removeItem("bills");

      const storedIncomes = localStorage.getItem("incomes");
      const storedBills = localStorage.getItem("bills");

      // 💵 Setup Default Incomes
      if (!storedIncomes) {
        const baseDate = dayjs('2025-01-01');
        const sampleIncomes: Income[] = [
          // Majdi's bi-monthly salary
          { id: "1", source: "Majdi's Salary", amount: Math.round(4739), date: baseDate.date(1).toISOString() },
          { id: "2", source: "Majdi's Salary", amount: Math.round(4739), date: baseDate.date(15).toISOString() },
          // Ruba's bi-weekly salary
          { id: "3", source: "Ruba's Salary", amount: Math.round(2168), date: baseDate.date(10).toISOString() }
        ];
        setIncomes(sampleIncomes);
        localStorage.setItem("incomes", JSON.stringify(sampleIncomes));
        logger.info('Default incomes initialized', { count: sampleIncomes.length });
      } else {
        const parsedIncomes = JSON.parse(storedIncomes).map((income: Income) => ({
          ...income,
          amount: Math.round(income.amount)
        }));
        setIncomes(parsedIncomes);
        logger.info('Incomes loaded from storage', { count: parsedIncomes.length });
      }

      // 🧾 Setup Default Bills
      if (!storedBills) {
        const sampleBills: Bill[] = [
          { id: "1", name: "ATT Phone Bill ($115 Rund Roaming)", amount: Math.round(429), day: 1 },
          { id: "2", name: "Maid's 1st payment", amount: Math.round(120), day: 1 },
          { id: "3", name: "Monthly Rent", amount: Math.round(3750), day: 1 },
          { id: "4", name: "Sling TV (CC 9550)", amount: Math.round(75), day: 3 },
          { id: "5", name: "Cox Internet", amount: Math.round(81), day: 6 },
          { id: "6", name: "Water Bill", amount: Math.round(80), day: 7 },
          { id: "7", name: "NV Energy Electrical ($100 winter months)", amount: Math.round(250), day: 7 },
          { id: "8", name: "TransAmerica Life Insurance", amount: Math.round(77), day: 9 },
          { id: "9", name: "Credit Card minimum payments", amount: Math.round(225), day: 14 },
          { id: "10", name: "Apple/Google/YouTube (CC 9550)", amount: Math.round(130), day: 14 },
          { id: "11", name: "Expenses & Groceries charged on (CC 2647)", amount: Math.round(3000), day: 16 },
          { id: "12", name: "Maid's 2nd Payment of the month", amount: Math.round(120), day: 17 },
          { id: "13", name: "SoFi Personal Loan", amount: Math.round(1915), day: 17 },
          { id: "14", name: "Southwest Gas ($200 in winter/$45 in summer)", amount: Math.round(75), day: 17 },
          { id: "15", name: "Car Insurance for 3 cars ($268 + $169 + $303 + $21)", amount: Math.round(704), day: 28 }
        ];
        setBills(sampleBills);
        localStorage.setItem("bills", JSON.stringify(sampleBills));
        logger.info('Default bills initialized', { count: sampleBills.length });
      } else {
        const parsedBills = JSON.parse(storedBills).map((bill: Bill) => ({
          ...bill,
          amount: Math.round(bill.amount)
        }));
        setBills(parsedBills);
        logger.info('Bills loaded from storage', { count: parsedBills.length });
      }
    } catch (error) {
      logger.error('Error initializing application data', { error });
    }
  }, []);

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