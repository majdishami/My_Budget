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

  // Function to check if current route matches given path
  const isActiveRoute = (path: string) => {
    return location === path;
  };

  // Function to format the occurrence type for display
  const formatOccurrenceType = (income: Income) => {
    if (income.source === "Majdi's Salary") return "Twice Monthly";
    if (income.source === "Ruba's Salary") return "Bi-Weekly";

    const types = {
      'once': 'One Time',
      'weekly': 'Weekly',
      'monthly': 'Monthly',
      'biweekly': 'Bi-Weekly',
      'twice-monthly': 'Twice Monthly'
    };
    return types[income.occurrenceType || 'monthly'];
  };

  return (
    <div className="relative">
      {/* Mobile Controls */}
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
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar Content */}
      <div className={clsx(
        "fixed inset-y-0 left-0 z-40 w-[280px] bg-background border-r transform",
        "lg:relative lg:translate-x-0 lg:w-auto",
        "transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "overflow-y-auto h-screen lg:h-auto"
      )}>
        <div className="p-4 space-y-6 pt-16 lg:pt-4">
          {/* Income Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Incomes</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onAddIncome}
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {incomes.map((income) => (
                <div
                  key={income.id}
                  className="flex items-center justify-between p-2 hover:bg-accent rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {income.source}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatOccurrenceType(income)} - {formatCurrency(income.amount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEditTransaction('income', income)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onDeleteTransaction('income', income)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Navigation */}
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

            {/* Categories */}
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

            {/* Reports */}
            <div className="space-y-2">
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
                  Monthly to Date
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

              <Link href="/reports/income" onClick={() => setIsOpen(false)}>
                <Button
                  variant={isActiveRoute("/reports/income") ? "default" : "ghost"}
                  size="sm"
                  className={clsx(
                    "w-full justify-start",
                    isActiveRoute("/reports/income") && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  <FileBarChart className="mr-2 h-4 w-4" />
                  Income Report
                </Button>
              </Link>

              <Link href="/reports/expenses" onClick={() => setIsOpen(false)}>
                <Button
                  variant={isActiveRoute("/reports/expenses") ? "default" : "ghost"}
                  size="sm"
                  className={clsx(
                    "w-full justify-start",
                    isActiveRoute("/reports/expenses") && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  <FileBarChart className="mr-2 h-4 w-4" />
                  Expense Report
                </Button>
              </Link>
            </div>

            {/* Utilities */}
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
          </div>
        </div>
      </div>

      {/* Dialogs */}
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
  );
}

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};