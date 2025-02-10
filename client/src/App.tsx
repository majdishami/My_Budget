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
import { Card } from "@/components/ui/card";

function Router() {
  const { isLoading, error: dataError } = useData();
  // Set today to February 8th, 2025
  const today = dayjs('2025-02-10');

  // Current date info for display
  const currentDate = useMemo(() => ({
    day: today.date(),
    weekday: today.format('dddd'),
    month: today.format('MMMM'),
    year: today.year()
  }), [today]);

  //State for month and year selection
  const [selectedMonth, setSelectedMonth] = useState(today.month());
  const [selectedYear, setSelectedYear] = useState(today.year());

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: dayjs().month(i).format('MMMM'),
    }));
  }, []);

  const years = useMemo(() => {
    const currentYear = today.year();
    return Array.from({ length: 5 }, (_, i) => currentYear + i); //Show next 5 years
  }, [today]);


  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };


  // Sample data - Replace with actual data fetching logic
  const monthlyTotals = useMemo(() => ({
    totalIncome: 2500,
    totalBills: 1200,
    balance: 1300,
  }), []);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

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

      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Card className="p-4 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">
                  My Budget - {dayjs().month(selectedMonth).format("MMMM")} {selectedYear}
                </h1>
                <div className="flex items-center gap-2">
                  {/* Month selection dropdown */}
                  <select 
                    value={selectedMonth}
                    onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                    className="p-2 border rounded bg-background min-w-[120px]"
                    aria-label="Select month"
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>

                  {/* Year selection dropdown */}
                  <select
                    value={selectedYear}
                    onChange={(e) => handleYearChange(parseInt(e.target.value))}
                    className="p-2 border rounded bg-background min-w-[100px]"
                    aria-label="Select year"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>

                  {/* Current date display */}
                  <span className="text-muted-foreground">
                    {currentDate.weekday}, {currentDate.day}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <ThemeToggle />
                <div>
                  <p className="text-sm text-muted-foreground">Total Income</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(monthlyTotals.totalIncome)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Bills</p>
                  <p className="text-lg font-semibold text-red-600">
                    {formatCurrency(monthlyTotals.totalBills)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Balance</p>
                  <p className={`text-lg font-semibold ${
                    monthlyTotals.balance >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {formatCurrency(monthlyTotals.balance)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </header>

        <main className="container py-6">
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
        </main>
      </div>
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