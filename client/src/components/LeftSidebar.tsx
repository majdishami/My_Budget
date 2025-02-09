import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Income, Bill } from "@/types";
import {
  Plus,
  RefreshCw,
  FileText,
  Calendar,
  ChartBar,
  FileBarChart,
  Edit,
  Trash,
  CalendarRange,
  Download,
  Bell,
  Tags // Added for Categories icon
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import dayjs from "dayjs";
import { useState } from "react";
import { ExportDialog } from "@/components/ExportDialog";
import { ViewRemindersDialog } from "@/components/ViewRemindersDialog";

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
  const [, setLocation] = useLocation();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showRemindersDialog, setShowRemindersDialog] = useState(false);

  // Calculate all income occurrences for the current month
  const getMonthlyIncomeOccurrences = () => {
    const currentDate = dayjs();
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startDate = dayjs('2025-01-10'); // Ruba's salary start date

    const occurrences: Income[] = [];

    incomes.forEach(income => {
      if (income.source === "Ruba's Salary") {
        // Calculate bi-weekly occurrences
        let checkDate = startDate.clone();
        while (checkDate.isBefore(endOfMonth) || checkDate.isSame(endOfMonth)) {
          if (checkDate.isAfter(startOfMonth) || checkDate.isSame(startOfMonth)) {
            if (checkDate.day() === 5) { // Friday
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
        // Regular monthly incomes
        occurrences.push(income);
      }
    });

    return occurrences;
  };

  const monthlyIncomes = getMonthlyIncomeOccurrences();

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const handleResetConfirm = () => {
    onReset();
    setShowResetConfirm(false);
  };

  return (
    <div className="space-y-6">
      {/* Expenses Section */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold px-2">Expenses</h2>
        <div className="space-y-2">
          <Select onValueChange={(value) => {
            const bill = bills.find(b => b.id === value);
            if (bill) onEditTransaction('bill', bill);
          }}>
            <SelectTrigger className="w-full justify-start">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Edit className="mr-2 h-4 w-4" />
                Edit Expense
              </Button>
            </SelectTrigger>
            <SelectContent>
              {bills.map((bill) => (
                <SelectItem key={bill.id} value={bill.id}>
                  {bill.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={onAddBill}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>

          <Select onValueChange={(value) => {
            const bill = bills.find(b => b.id === value);
            if (bill) onDeleteTransaction('bill', bill);
          }}>
            <SelectTrigger className="w-full justify-start">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Trash className="mr-2 h-4 w-4" />
                Delete Expense
              </Button>
            </SelectTrigger>
            <SelectContent>
              {bills.map((bill) => (
                <SelectItem key={bill.id} value={bill.id}>
                  {bill.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => setShowRemindersDialog(true)}
          >
            <Bell className="mr-2 h-4 w-4" />
            View Reminders
          </Button>
        </div>
      </div>

      {/* Income Section */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold px-2">Income</h2>
        <div className="space-y-2">
          <Select onValueChange={(value) => {
            const income = monthlyIncomes.find(i => i.id === value);
            if (income) onEditTransaction('income', income);
          }}>
            <SelectTrigger className="w-full justify-start">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Edit className="mr-2 h-4 w-4" />
                Edit Income
              </Button>
            </SelectTrigger>
            <SelectContent>
              {monthlyIncomes.map((income) => (
                <SelectItem key={income.id} value={income.id}>
                  {income.source} {income.source === "Ruba's Salary" ? `(${dayjs(income.date).format('MMM D')})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={onAddIncome}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Income
          </Button>

          <Select onValueChange={(value) => {
            const income = monthlyIncomes.find(i => i.id === value);
            if (income) onDeleteTransaction('income', income);
          }}>
            <SelectTrigger className="w-full justify-start">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Trash className="mr-2 h-4 w-4" />
                Delete Income
              </Button>
            </SelectTrigger>
            <SelectContent>
              {monthlyIncomes.map((income) => (
                <SelectItem key={income.id} value={income.id}>
                  {income.source} {income.source === "Ruba's Salary" ? `(${dayjs(income.date).format('MMM D')})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* New Categories Section */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold px-2">Categories</h2>
        <div className="space-y-2">
          <Link href="/categories">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <Tags className="mr-2 h-4 w-4" />
              Manage Categories
            </Button>
          </Link>
        </div>
      </div>

      {/* Reports Section */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold px-2">Reports</h2>
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => setShowExportDialog(true)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Link href="/reports/monthly-to-date">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Monthly up today
            </Button>
          </Link>
          <Link href="/reports/monthly">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <ChartBar className="mr-2 h-4 w-4" />
              Monthly Report
            </Button>
          </Link>
          <Link href="/reports/annual">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <CalendarRange className="mr-2 h-4 w-4" />
              Annual Report
            </Button>
          </Link>
          <Link href="/reports/date-range">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <FileBarChart className="mr-2 h-4 w-4" />
              Date Range Report
            </Button>
          </Link>
          <Link href="/reports/income">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <FileText className="mr-2 h-4 w-4" />
              Income Report
            </Button>
          </Link>
          <Link href="/reports/expenses">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <FileText className="mr-2 h-4 w-4" />
              Expenses Report
            </Button>
          </Link>
        </div>
      </div>

      {/* Reset Section */}
      <div className="pt-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={handleResetClick}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Default Values</AlertDialogTitle>
            <AlertDialogDescription>
              All Bills and Incomes will be reset to Jan.01.2025 numbers. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowResetConfirm(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleResetConfirm}>
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onOpenChange={setShowExportDialog}
        incomes={incomes}
        bills={bills}
      />

      {/* Add ViewRemindersDialog */}
      <ViewRemindersDialog
        isOpen={showRemindersDialog}
        onOpenChange={setShowRemindersDialog}
        bills={bills}
      />
    </div>
  );
}