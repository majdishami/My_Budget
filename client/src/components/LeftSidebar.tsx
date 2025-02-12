import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Income, Bill } from "@/types";
import {
  Plus,
  FileText,
  Calendar,
  ChartBar,
  FileBarChart,
  Edit,
  Trash,
  CalendarRange,
  Download,
  Bell,
  Tags,
  Database,
  Menu,
  RefreshCw,
  LayoutDashboard
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import dayjs from "dayjs";
import { useState } from "react";
import { ExportDialog } from "@/components/ExportDialog";
import { ViewRemindersDialog } from "@/components/ViewRemindersDialog";
import { DatabaseSyncDialog } from "@/components/DatabaseSyncDialog";
import { clsx } from "clsx";

interface LeftSidebarProps {
  incomes: Income[];
  bills: Bill[];
  onEditTransaction: (type: 'income' | 'bill', data: Income | Bill) => void;
  onDeleteTransaction: (type: 'income' | 'bill', data: Income | Bill) => void;
  onAddIncome: () => void;
  onAddBill: () => void;
  onReset: () => void;
}

export function LeftSidebar({
  incomes,
  bills,
  onEditTransaction,
  onDeleteTransaction,
  onAddIncome,
  onAddBill,
  onReset,
}: LeftSidebarProps) {
  const [location] = useLocation();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showRemindersDialog, setShowRemindersDialog] = useState(false);
  const [showDatabaseSyncDialog, setShowDatabaseSyncDialog] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const getMonthlyIncomeOccurrences = () => {
    const currentDate = dayjs();
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startDate = dayjs('2025-01-10');

    const occurrences: Income[] = [];

    incomes.forEach(income => {
      if (income.source === "Ruba's Salary") {
        let checkDate = startDate.clone();
        while (checkDate.isBefore(endOfMonth) || checkDate.isSame(endOfMonth)) {
          if (checkDate.isAfter(startOfMonth) || checkDate.isSame(startOfMonth)) {
            if (checkDate.day() === 5) {
              const weeksDiff = checkDate.diff(startDate, 'week');
              if (weeksDiff >= 0 && weeksDiff % 2 === 0) {
                occurrences.push({
                  ...income,
                  date: checkDate.toISOString(),
                  id: `${income.id}-${checkDate.format('YYYY-MM-DD')}`
                });
              }
            }
          }
          checkDate = checkDate.add(1, 'day');
        }
      } else {
        occurrences.push(income);
      }
    });

    return occurrences;
  };

  const monthlyIncomes = getMonthlyIncomeOccurrences();

  const handleRefresh = () => {
    window.location.reload();
  };

  const isActiveRoute = (path: string) => {
    return location === path;
  };

  return (
    <div className="relative">
      {/* Mobile Controls - Outside the sliding panel */}
      <div className="lg:hidden fixed top-4 left-4 z-50 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="bg-background"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="bg-background"
          onClick={handleRefresh}
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>

      <div className={clsx(
        "fixed inset-y-0 left-0 z-40 w-[280px] bg-background border-r transform",
        "lg:relative lg:translate-x-0 lg:w-auto",
        "transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "overflow-y-auto h-screen lg:h-auto"
      )}>
        <div className="p-4 space-y-6 pt-16 lg:pt-4">
          {/* Main Navigation Section */}
          <div className="space-y-2">
            <Link href="/">
              <Button
                variant={isActiveRoute("/") ? "default" : "ghost"}
                size="sm"
                className={clsx(
                  "w-full justify-start",
                  isActiveRoute("/") && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                onClick={() => setIsOpen(false)}
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>

            {/* Expenses Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Expenses
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                <DropdownMenuItem onClick={() => {
                  onAddBill();
                  setIsOpen(false);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Edit Expenses</DropdownMenuLabel>
                {bills.map((bill) => (
                  <DropdownMenuItem
                    key={`edit-${bill.id}`}
                    onClick={() => {
                      onEditTransaction('bill', bill);
                      setIsOpen(false);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    {bill.name}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Delete Expenses</DropdownMenuLabel>
                {bills.map((bill) => (
                  <DropdownMenuItem
                    key={`delete-${bill.id}`}
                    onClick={() => {
                      onDeleteTransaction('bill', bill);
                      setIsOpen(false);
                    }}
                    className="text-red-600"
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    {bill.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Income Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Income
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                <DropdownMenuItem onClick={() => {
                  onAddIncome();
                  setIsOpen(false);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Income
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Edit Income</DropdownMenuLabel>
                {monthlyIncomes.map((income) => (
                  <DropdownMenuItem
                    key={`edit-${income.id}`}
                    onClick={() => {
                      onEditTransaction('income', income);
                      setIsOpen(false);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    {income.source} {income.source === "Ruba's Salary" ? `(${dayjs(income.date).format('MMM D')})` : ''}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Delete Income</DropdownMenuLabel>
                {monthlyIncomes.map((income) => (
                  <DropdownMenuItem
                    key={`delete-${income.id}`}
                    onClick={() => {
                      onDeleteTransaction('income', income);
                      setIsOpen(false);
                    }}
                    className="text-red-600"
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    {income.source} {income.source === "Ruba's Salary" ? `(${dayjs(income.date).format('MMM D')})` : ''}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/categories" onClick={() => setIsOpen(false)}>
              <Button
                variant={isActiveRoute("/categories") ? "default" : "ghost"}
                size="sm"
                className={clsx(
                  "w-full justify-start",
                  isActiveRoute("/categories") && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                <Tags className="mr-2 h-4 w-4" />
                Categories
              </Button>
            </Link>
          </div>

          {/* Reports Section - Update the View Reminders button */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold px-2">Reports</h2>
            <div className="space-y-2">
              {/* Move View Reminders button to the top for better visibility */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setShowRemindersDialog(true);
                  setIsOpen(false);
                }}
              >
                <Bell className="mr-2 h-4 w-4" />
                View Reminders
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setShowExportDialog(true);
                  setIsOpen(false);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setShowDatabaseSyncDialog(true);
                  setIsOpen(false);
                }}
              >
                <Database className="mr-2 h-4 w-4" />
                Sync Database
              </Button>

              <Link href="/reports/monthly-to-date" onClick={() => setIsOpen(false)}>
                <Button
                  variant={isActiveRoute("/reports/monthly-to-date") ? "default" : "ghost"}
                  size="sm"
                  className={clsx(
                    "w-full justify-start",
                    isActiveRoute("/reports/monthly-to-date") && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Monthly up today
                </Button>
              </Link>

              <Link href="/reports/monthly" onClick={() => setIsOpen(false)}>
                <Button
                  variant={isActiveRoute("/reports/monthly") ? "default" : "ghost"}
                  size="sm"
                  className={clsx(
                    "w-full justify-start",
                    isActiveRoute("/reports/monthly") && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  <ChartBar className="mr-2 h-4 w-4" />
                  Monthly Report
                </Button>
              </Link>

              <Link href="/reports/annual" onClick={() => setIsOpen(false)}>
                <Button
                  variant={isActiveRoute("/reports/annual") ? "default" : "ghost"}
                  size="sm"
                  className={clsx(
                    "w-full justify-start",
                    isActiveRoute("/reports/annual") && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  <CalendarRange className="mr-2 h-4 w-4" />
                  Annual Report
                </Button>
              </Link>

              <Link href="/reports/date-range" onClick={() => setIsOpen(false)}>
                <Button
                  variant={isActiveRoute("/reports/date-range") ? "default" : "ghost"}
                  size="sm"
                  className={clsx(
                    "w-full justify-start",
                    isActiveRoute("/reports/date-range") && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  <FileBarChart className="mr-2 h-4 w-4" />
                  Date Range Report
                </Button>
              </Link>
            </div>
          </div>
        </div>

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
    </div>
  );
}