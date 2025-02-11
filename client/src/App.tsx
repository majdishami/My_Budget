/**
 * ================================================
 * 🚀 Main Application Component
 * ================================================
 */

import { useState, useEffect, useMemo } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Budget } from "@/pages/Budget";
import dayjs from 'dayjs';
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useData } from "@/contexts/DataContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Loader2, X, PlusCircle, BarChart4, FolderTree, LayoutDashboard,
  Download, Database, Calendar, ChartBar, CalendarRange, FileBarChart,
  FileText, Bell, Edit, Trash, Tags
} from "lucide-react";
import { Card } from "@/components/ui/card";
import CategoriesPage from "@/pages/Categories";
import NotFound from "@/pages/not-found";
import MonthlyToDateReport from "@/pages/monthly-to-date";
import MonthlyReport from "@/pages/monthly";
import AnnualReport from "@/pages/annual";
import DateRangeReport from "@/pages/date-range";
import IncomeReport from "@/pages/income";
import ExpenseReport from "@/pages/expenses";
import { Button } from "@/components/ui/button";
import { AddIncomeDialog } from "@/components/AddIncomeDialog";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { ExportDialog } from "@/components/ExportDialog";
import { ViewRemindersDialog } from "@/components/ViewRemindersDialog";
import { DatabaseSyncDialog } from "@/components/DatabaseSyncDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { clsx } from 'clsx';

function Router() {
  const { isLoading, error: dataError, incomes, bills, deleteTransaction, editTransaction, addIncome, addBill } = useData();
  const [location] = useLocation();
  const today = dayjs('2025-02-11');
  const [showAddIncomeDialog, setShowAddIncomeDialog] = useState(false);
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showRemindersDialog, setShowRemindersDialog] = useState(false);
  const [showDatabaseSyncDialog, setShowDatabaseSyncDialog] = useState(false);

  const currentDate = useMemo(() => ({
    day: today.date(),
    weekday: today.format('dddd'),
    month: today.format('MMMM'),
    year: today.year()
  }), [today]);

  const [selectedMonth, setSelectedMonth] = useState(today.month());
  const [selectedYear, setSelectedYear] = useState(today.year());

  const months = useMemo(() => (
    Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: dayjs().month(i).format('MMMM')
    }))
  ), []);

  const years = useMemo(() => {
    const currentYear = today.year();
    return Array.from({ length: 5 }, (_, i) => currentYear + i);
  }, [today]);

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
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

      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Card className="p-4">
            <div className="flex flex-col gap-4">
              {/* Top row with title and controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <h1 className="text-xl font-bold">
                    My Budget
                  </h1>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedMonth}
                      onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                      className="py-1 px-2 border rounded bg-background text-sm min-w-[120px]"
                      aria-label="Select month"
                    >
                      {months.map(month => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedYear}
                      onChange={(e) => handleYearChange(parseInt(e.target.value))}
                      className="py-1 px-2 border rounded bg-background text-sm min-w-[100px]"
                      aria-label="Select year"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>

                    <span className="text-primary font-medium text-sm border-l pl-2 ml-2">
                      {currentDate.weekday}, {currentDate.day}
                    </span>
                  </div>
                </div>

                <ThemeToggle />
              </div>

              {/* Navigation row */}
              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-4">
                  <Link href="/">
                    <Button
                      variant={location === "/" ? "default" : "ghost"}
                      size="sm"
                      className={clsx(
                        "cursor-pointer",
                        location === "/" && "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>

                  {/* Expenses Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <FolderTree className="h-4 w-4 mr-2" />
                        Expenses
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setShowAddExpenseDialog(true)}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Expense
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowRemindersDialog(true)}>
                        <Bell className="h-4 w-4 mr-2" />
                        View Reminders
                      </DropdownMenuItem>
                      {bills.map((bill) => (
                        <DropdownMenuItem key={bill.id} className="flex justify-between">
                          <span className="truncate mr-4">{bill.name}</span>
                          <div className="flex gap-2">
                            <button onClick={() => editTransaction('bill', bill)}>
                              <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={() => deleteTransaction('bill', bill)}>
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Income Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Income
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setShowAddIncomeDialog(true)}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Income
                      </DropdownMenuItem>
                      {incomes.map((income) => (
                        <DropdownMenuItem key={income.id} className="flex justify-between">
                          <span className="truncate mr-4">{income.source}</span>
                          <div className="flex gap-2">
                            <button onClick={() => editTransaction('income', income)}>
                              <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={() => deleteTransaction('income', income)}>
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Categories Link */}
                  <Link href="/categories">
                    <Button variant="ghost" size="sm">
                      <Tags className="h-4 w-4 mr-2" />
                      Categories
                    </Button>
                  </Link>

                  {/* Reports Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <BarChart4 className="h-4 w-4 mr-2" />
                        Reports
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem asChild>
                        <Link href="/reports/monthly-to-date">
                          <Calendar className="h-4 w-4 mr-2" />
                          Monthly to Date
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/reports/monthly">
                          <ChartBar className="h-4 w-4 mr-2" />
                          Monthly Report
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/reports/annual">
                          <CalendarRange className="h-4 w-4 mr-2" />
                          Annual Report
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/reports/date-range">
                          <FileBarChart className="h-4 w-4 mr-2" />
                          Date Range
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/reports/income">
                          <FileText className="h-4 w-4 mr-2" />
                          Income Report
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/reports/expenses">
                          <FileText className="h-4 w-4 mr-2" />
                          Expense Report
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowDatabaseSyncDialog(true)}>
                        <Database className="h-4 w-4 mr-2" />
                        Sync Database
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </Card>
        </header>

        <main className="flex-1 overflow-hidden mt-6">
          <div className="h-full p-2">
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
          </div>
        </main>

        {/* Dialogs */}
        <AddIncomeDialog
          isOpen={showAddIncomeDialog}
          onOpenChange={setShowAddIncomeDialog}
          onConfirm={addIncome}
        />
        <AddExpenseDialog
          isOpen={showAddExpenseDialog}
          onOpenChange={setShowAddExpenseDialog}
          onConfirm={addBill}
        />
        <ExportDialog
          isOpen={showExportDialog}
          onOpenChange={setShowExportDialog}
          incomes={incomes}
          bills={bills}
        />
        <ViewRemindersDialog
          isOpen={showRemindersDialog}
          onOpenChange={setShowRemindersDialog}
          bills={bills}
        />
        <DatabaseSyncDialog 
          isOpen={showDatabaseSyncDialog}
          onOpenChange={setShowDatabaseSyncDialog}
        />
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