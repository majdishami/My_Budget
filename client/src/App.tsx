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
//import { Button } from "@/components/ui/button"; // Removed as per intention
import { AddIncomeDialog } from "@/components/AddIncomeDialog";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { EditIncomeDialog } from "@/components/EditIncomeDialog";
import EditExpenseDialog from "@/components/EditExpenseDialog";
import { ExportDialog } from "@/components/ExportDialog";
import { ViewRemindersDialog } from "@/components/ViewRemindersDialog";
import { DatabaseSyncDialog } from "@/components/DatabaseSyncDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { clsx } from 'clsx';
import { Income, Bill, OccurrenceType } from "@/types";
import crypto from 'crypto';

function Router() {
  const { isLoading, error: dataError, incomes, bills, deleteTransaction, editTransaction, addIncome: addIncomeToData, addBill } = useData();
  const [location] = useLocation();
  const today = dayjs('2025-02-11');
  const [showAddIncomeDialog, setShowAddIncomeDialog] = useState(false);
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showRemindersDialog, setShowRemindersDialog] = useState(false);
  const [showDatabaseSyncDialog, setShowDatabaseSyncDialog] = useState(false);
  const [showEditIncomeDialog, setShowEditIncomeDialog] = useState(false);
  const [showEditExpenseDialog, setShowEditExpenseDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  const handleDeleteTransaction = (type: 'income' | 'bill', transaction: Income | Bill) => {
    if (type === 'income') {
      setSelectedIncome(transaction as Income);
    } else {
      setSelectedBill(transaction as Bill);
    }
    setShowDeleteDialog(true);
  };

  const handleEditTransaction = (type: 'income' | 'bill', transaction: Income | Bill) => {
    if (type === 'income') {
      setSelectedIncome(transaction as Income);
      setShowEditIncomeDialog(true);
    } else {
      setSelectedBill(transaction as Bill);
      setShowEditExpenseDialog(true);
    }
  };

  const handleConfirmDelete = () => {
    if (selectedIncome) {
      deleteTransaction(selectedIncome);
      setSelectedIncome(null);
    } else if (selectedBill) {
      deleteTransaction(selectedBill);
      setSelectedBill(null);
    }
    setShowDeleteDialog(false);
  };

  const handleAddIncome = (newIncome: Omit<Income, "id"> & { occurrenceType: OccurrenceType }) => {
    const incomeWithId: Income = {
      ...newIncome,
      id: crypto.randomUUID(),
    };
    addIncomeToData(incomeWithId);
  };

  const currentDate = useMemo(() => ({
    day: today.date(),
    weekday: today.format('dddd'),
    month: today.format('MMMM'),
    year: today.year()
  }), [today]);

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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <h1 className="text-xl font-bold">
                    My Budget
                  </h1>
                </div>
                <ThemeToggle />
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-4">
                  <Link
                    href="/"
                    className={clsx(
                      "flex items-center gap-2 px-3 py-2 rounded-md",
                      location === "/"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "hover:bg-accent hover:text-accent-foreground",
                      "transition-colors"
                    )}
                    aria-label="Go to Dashboard"
                  >
                    <LayoutDashboard className="h-4 w-4 pointer-events-none" aria-hidden="true" />
                    <span className="pointer-events-none">Dashboard</span>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 px-3 py-2 rounded-md select-none hover:bg-accent hover:text-accent-foreground transition-colors"> {/* Replaced Button with a button */}
                        <FolderTree className="h-4 w-4 mr-2" />
                        Expenses
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      side="bottom"
                      sideOffset={4}
                      className="max-h-[300px] overflow-y-auto w-[200px]"
                    >
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
                            <button onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditTransaction('bill', bill);
                            }}>
                              <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteTransaction('bill', bill);
                            }}>
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 px-3 py-2 rounded-md select-none hover:bg-accent hover:text-accent-foreground transition-colors"> {/* Replaced Button with a button */}
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Income
                      </button>
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
                            <button onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditTransaction('income', income);
                            }}>
                              <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteTransaction('income', income);
                            }}>
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Link href="/categories">
                    <button className="flex items-center gap-2 px-3 py-2 rounded-md select-none hover:bg-accent hover:text-accent-foreground transition-colors"> {/* Replaced Button with a button */}
                      <Tags className="h-4 w-4 mr-2" />
                      Categories
                    </button>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 px-3 py-2 rounded-md select-none hover:bg-accent hover:text-accent-foreground transition-colors"> {/* Replaced Button with a button */}
                        <BarChart4 className="h-4 w-4 mr-2" />
                        Reports
                      </button>
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

        <AddIncomeDialog
          isOpen={showAddIncomeDialog}
          onOpenChange={setShowAddIncomeDialog}
          onConfirm={handleAddIncome}
        />
        <AddExpenseDialog
          isOpen={showAddExpenseDialog}
          onOpenChange={setShowAddExpenseDialog}
          onConfirm={addBill}
        />
        <EditIncomeDialog
          isOpen={showEditIncomeDialog}
          onOpenChange={setShowEditIncomeDialog}
          income={selectedIncome}
          onUpdate={(updatedIncome) => {
            editTransaction(updatedIncome);
            setShowEditIncomeDialog(false);
            setSelectedIncome(null);
          }}
        />
        {selectedBill && (
          <EditExpenseDialog
            isOpen={showEditExpenseDialog}
            onOpenChange={setShowEditExpenseDialog}
            expense={selectedBill}
            onUpdate={(updatedBill) => {
              editTransaction(updatedBill);
              setShowEditExpenseDialog(false);
              setSelectedBill(null);
            }}
          />
        )}
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

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this transaction? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowDeleteDialog(false);
                setSelectedIncome(null);
                setSelectedBill(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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