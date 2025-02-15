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
  Loader2, Menu, BarChart4,
  Download, Database, Tags, ChevronDown,
  RotateCw, Plus, Edit, Trash, FileText, Bell,
  PlusCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import CategoriesPage from "@/pages/Categories";
import NotFound from "@/pages/not-found";
import MonthlyToDateReport from "@/pages/monthly-to-date";
import MonthlyReport from "@/pages/monthly";
import AnnualReport from "@/pages/annual";
import DateRangeReport from "@/pages/date-range";
import IncomeReport from "@/pages/income";
import ExpenseReport from "@/pages/expenses";
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
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Income, Bill } from "@/types";
import crypto from 'crypto';
import { Badge } from "@/components/ui/badge";
import { logger } from './lib/logger';



function Router() {
  const { isLoading, error: dataError, incomes, bills, deleteTransaction, editTransaction, addIncomeToData, addBill, refresh } = useData();
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
      const income = transaction as Income;
      // Set correct occurrence type based on source
      if (income.source === "Majdi's Salary") {
        income.occurrenceType = 'twice-monthly';
        income.firstDate = 1;
        income.secondDate = 15;
      } else if (income.source === "Ruba's Salary") {
        income.occurrenceType = 'biweekly';
      }
      setSelectedIncome(income);
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

  const handleAddIncome = (newIncome: Income) => {
    try {
      if (!newIncome.id) {
        newIncome.id = crypto.randomUUID();
      }

      // Set correct occurrence type based on source
      if (newIncome.source === "Majdi's Salary") {
        newIncome.occurrenceType = 'twice-monthly';
        newIncome.firstDate = 1;
        newIncome.secondDate = 15;
      } else if (newIncome.source === "Ruba's Salary") {
        newIncome.occurrenceType = 'biweekly';
      }

      addIncomeToData(newIncome);
      setShowAddIncomeDialog(false);
    } catch (error) {
      logger.error("Error adding income:", {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const currentDate = useMemo(() => ({
    day: today.date(),
    weekday: today.format('dddd'),
    month: today.format('MMMM'),
    year: today.year()
  }), [today]);

  // If either initial loading or manual refresh is happening, show loading state
  if (isLoading || isRefreshing) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">
            {isRefreshing ? 'Refreshing data...' : 'Loading your budget...'}
          </p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <Alert
        variant="destructive"
        className="fixed top-4 right-4 w-auto z-50 animate-in fade-in slide-in-from-top-2"
        role="alert"
      >
        <AlertDescription className="flex items-center gap-2">
          {dataError.message}
          <button
            onClick={() => refresh()}
            className="p-1 hover:bg-accent rounded"
            aria-label="Retry loading data"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </AlertDescription>
      </Alert>
    );
  }


  return (
    <ErrorBoundary name="MainRouter">
      <div className="min-h-screen flex flex-col bg-background">
        <ErrorBoundary name="Navigation">
          <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h1 className="text-xl font-bold">
                    My Budget
                  </h1>
                  {isMobile ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-2 hover:bg-accent rounded-md relative"
                        aria-label="Refresh data"
                      >
                        <RotateCw className={cn(
                          "h-5 w-5",
                          isRefreshing && "animate-spin"
                        )} />
                      </button>
                      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                        <SheetTrigger asChild>
                          <button className="p-2 hover:bg-accent rounded-md">
                            <Menu className="h-5 w-5" />
                          </button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[80vw] sm:w-[350px]">
                          <nav className="flex flex-col gap-4 mt-4">
                            <Link href="/" className="flex items-center gap-2 p-2 hover:bg-accent rounded-md">
                              Dashboard
                            </Link>
                            <Link href="/categories" className="flex items-center gap-2 p-2 hover:bg-accent rounded-md">
                              <Tags className="h-4 w-4" />
                              Categories
                            </Link>
                            <button
                              onClick={() => {
                                setIsMenuOpen(false);
                                setShowAddExpenseDialog(true);
                              }}
                              className="flex items-center gap-2 p-2 hover:bg-accent rounded-md text-left"
                            >
                              <PlusCircle className="h-4 w-4" />
                              Add Expense
                            </button>
                            <button
                              onClick={() => {
                                setIsMenuOpen(false);
                                setShowAddIncomeDialog(true);
                              }}
                              className="flex items-center gap-2 p-2 hover:bg-accent rounded-md text-left"
                            >
                              <PlusCircle className="h-4 w-4" />
                              Add Income
                            </button>
                            <button
                              onClick={() => {
                                setIsMenuOpen(false);
                                setShowRemindersDialog(true);
                              }}
                              className="flex items-center gap-2 p-2 hover:bg-accent rounded-md text-left"
                            >
                              View Reminders
                            </button>
                            <div className="flex flex-col gap-2">
                              <h3 className="font-medium px-2">Reports</h3>
                              <Link href="/reports/monthly-to-date" className="flex items-center gap-2 p-2 hover:bg-accent rounded-md">
                                Monthly to Date
                              </Link>
                              <Link href="/reports/monthly" className="flex items-center gap-2 p-2 hover:bg-accent rounded-md">
                                Monthly Report
                              </Link>
                              <Link href="/reports/annual" className="flex items-center gap-2 p-2 hover:bg-accent rounded-md">
                                Annual Report
                              </Link>
                              <Link href="/reports/date-range" className="flex items-center gap-2 p-2 hover:bg-accent rounded-md">
                                Date Range
                              </Link>
                              <Link href="/reports/income" className="flex items-center gap-2 p-2 hover:bg-accent rounded-md">
                                Income Report
                              </Link>
                              <Link href="/reports/expenses" className="flex items-center gap-2 p-2 hover:bg-accent rounded-md">
                                Expense Report
                              </Link>
                            </div>
                            <button
                              onClick={() => {
                                setIsMenuOpen(false);
                                setShowExportDialog(true);
                              }}
                              className="flex items-center gap-2 p-2 hover:bg-accent rounded-md text-left"
                            >
                              <Download className="h-4 w-4" />
                              Export Data
                            </button>
                            <button
                              onClick={() => {
                                setIsMenuOpen(false);
                                setShowDatabaseSyncDialog(true);
                              }}
                              className="flex items-center gap-2 p-2 hover:bg-accent rounded-md text-left"
                            >
                              <Database className="h-4 w-4" />
                              Sync Database
                            </button>
                          </nav>
                        </SheetContent>
                      </Sheet>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-2 px-3 py-2 rounded-md select-none hover:bg-accent hover:text-accent-foreground transition-colors">
                            <FileText className="h-4 w-4" />
                            Expenses
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="max-h-[60vh] overflow-y-auto">
                          <DropdownMenuItem onClick={() => setShowAddExpenseDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Expense
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Edit Expenses</DropdownMenuLabel>
                          <div className="max-h-[25vh] overflow-y-auto">
                            {bills.map((bill) => {
                              // Determine category-based color
                              const categoryColor =
                                bill.category_id === 1 ? "text-blue-600" :
                                  bill.category_id === 2 ? "text-green-600" :
                                    bill.category_id === 3 ? "text-purple-600" :
                                      bill.category_id === 4 ? "text-red-600" :
                                        bill.category_id === 5 ? "text-pink-600" :
                                          bill.category_id === 6 ? "text-orange-600" :
                                            bill.category_id === 7 ? "text-yellow-600" :
                                              bill.category_id === 8 ? "text-lime-600" :
                                                bill.category_id === 9 ? "text-cyan-600" :
                                                  bill.category_id === 10 ? "text-indigo-600" :
                                                    bill.category_id === 11 ? "text-violet-600" :
                                                      bill.category_id === 12 ? "text-amber-600" :
                                                        bill.category_id === 13 ? "text-emerald-600" :
                                                          "text-slate-600";

                              return (
                                <DropdownMenuItem
                                  key={`edit-${bill.id}`}
                                  onClick={() => handleEditTransaction('bill', bill)}
                                  className={categoryColor}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  {bill.name}
                                </DropdownMenuItem>
                              );
                            })}
                          </div>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Delete Expenses</DropdownMenuLabel>
                          <div className="max-h-[25vh] overflow-y-auto">
                            {bills.map((bill) => (
                              <DropdownMenuItem
                                key={`delete-${bill.id}`}
                                onClick={() => handleDeleteTransaction('bill', bill)}
                                className="text-red-600"
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                {bill.name}
                              </DropdownMenuItem>
                            ))}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-2 px-3 py-2 rounded-md select-none hover:bg-accent hover:text-accent-foreground transition-colors">
                            <FileText className="h-4 w-4" />
                            Income
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setShowAddIncomeDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Income
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Edit Income</DropdownMenuLabel>
                          {incomes.reduce((uniqueIncomes: Income[], income) => {
                            // For recurring incomes, only show the next occurrence
                            if (income.occurrenceType !== 'once') {
                              const existingIncome = uniqueIncomes.find(i => i.source === income.source);
                              if (!existingIncome || dayjs(income.date).isBefore(dayjs(existingIncome.date))) {
                                // Remove any existing income with same source
                                const filteredIncomes = uniqueIncomes.filter(i => i.source !== income.source);
                                return [...filteredIncomes, income];
                              }
                              return uniqueIncomes;
                            }
                            // For one-time incomes, show all
                            return [...uniqueIncomes, income];
                          }, []).map((income) => {
                            // Determine the correct occurrence type label
                            let occurrenceTypeLabel = income.occurrenceType;
                            if (income.source === "Majdi's Salary") {
                              occurrenceTypeLabel = "twice-monthly";
                            } else if (income.source === "Ruba's Salary") {
                              occurrenceTypeLabel = "biweekly";
                            }

                            return (
                              <DropdownMenuItem
                                key={`edit-${income.id}`}
                                onClick={() => handleEditTransaction('income', income)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                <div className="flex items-center gap-2">
                                  <span>{income.source}</span>
                                  <Badge variant="outline" className="ml-2">
                                    {occurrenceTypeLabel === 'twice-monthly' ? 'Twice Monthly' :
                                      occurrenceTypeLabel === 'biweekly' ? 'Bi-Weekly' :
                                        occurrenceTypeLabel === 'monthly' ? 'Monthly' :
                                          occurrenceTypeLabel === 'weekly' ? 'Weekly' : 'One Time'}
                                  </Badge>
                                  <span className="text-muted-foreground text-sm">
                                    ({dayjs(income.date).format('MMM D')})
                                  </span>
                                </div>
                              </DropdownMenuItem>
                            );
                          })}
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Delete Income</DropdownMenuLabel>
                          {incomes.reduce((uniqueIncomes: Income[], income) => {
                            // Same reduction logic as above for delete section
                            if (income.occurrenceType !== 'once') {
                              const existingIncome = uniqueIncomes.find(i => i.source === income.source);
                              if (!existingIncome || dayjs(income.date).isBefore(dayjs(existingIncome.date))) {
                                const filteredIncomes = uniqueIncomes.filter(i => i.source !== income.source);
                                return [...filteredIncomes, income];
                              }
                              return uniqueIncomes;
                            }
                            return [...uniqueIncomes, income];
                          }, []).map((income) => {
                            // Determine the correct occurrence type label for delete section
                            let occurrenceTypeLabel = income.occurrenceType;
                            if (income.source === "Majdi's Salary") {
                              occurrenceTypeLabel = "twice-monthly";
                            } else if (income.source === "Ruba's Salary") {
                              occurrenceTypeLabel = "biweekly";
                            }

                            return (
                              <DropdownMenuItem
                                key={`delete-${income.id}`}
                                onClick={() => handleDeleteTransaction('income', income)}
                                className="text-red-600"
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                <div className="flex items-center gap-2">
                                  <span>{income.source}</span>
                                  <Badge variant="outline" className="ml-2">
                                    {occurrenceTypeLabel === 'twice-monthly' ? 'Twice Monthly' :
                                      occurrenceTypeLabel === 'biweekly' ? 'Bi-Weekly' :
                                        occurrenceTypeLabel === 'monthly' ? 'Monthly' :
                                          occurrenceTypeLabel === 'weekly' ? 'Weekly' : 'One Time'}
                                  </Badge>
                                  <span className="text-muted-foreground text-sm">
                                    ({dayjs(income.date).format('MMM D')})
                                  </span>
                                </div>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Link href="/categories">
                        <button className="flex items-center gap-2 px-3 py-2 rounded-md select-none hover:bg-accent hover:text-accent-foreground transition-colors">
                          <Tags className="h-4 w-4" />
                          Categories
                        </button>
                      </Link>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-2 px-3 py-2 rounded-md select-none hover:bg-accent hover:text-accent-foreground transition-colors">
                            <BarChart4 className="h-4 w-4" />
                            Reports
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setShowRemindersDialog(true)}>
                            <Bell className="mr-2 h-4 w-4" />
                            View Reminders
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href="/reports/monthly-to-date">Monthly to Date</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/reports/monthly">Monthly Report</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/reports/annual">Annual Report</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/reports/date-range">Date Range</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/reports/income">Income Report</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/reports/expenses">Expense Report</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
                            Export Data
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <button
                        onClick={() => setShowDatabaseSyncDialog(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-md select-none hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <Database className="h-4 w-4" />
                        Sync Database
                      </button>

                      <ThemeToggle />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </header>
        </ErrorBoundary>

        <main className={cn(
          "flex-1 overflow-hidden mt-6",
          isMobile && "px-4"
        )}>
          <div className="h-full">
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

        <ErrorBoundary name="Dialogs">
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
            onUpdateBill={editTransaction}
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
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary
        name="RootErrorBoundary"
        onReset={() => {
          // Clear any cached data and reload the app
          queryClient.clear();
          window.location.reload();
        }}
      >
        <Router />
        <Toaster />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;