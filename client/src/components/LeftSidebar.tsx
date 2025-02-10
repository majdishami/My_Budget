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
  RefreshCw
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dayjs from "dayjs";
import { useState } from "react";
import { ExportDialog } from "@/components/ExportDialog";
import { ViewRemindersDialog } from "@/components/ViewRemindersDialog";
import { DatabaseSyncDialog } from "@/components/DatabaseSyncDialog";

interface LeftSidebarProps {
  incomes: Income[];
  bills: Bill[];
  onEditTransaction: (type: 'income' | 'bill', data: Income | Bill) => void;
  onDeleteTransaction: (type: 'income' | 'bill', data: Income | Bill) => void;
  onAddIncome: () => void;
  onAddBill: () => void;
}

export function LeftSidebar({
  incomes,
  bills,
  onEditTransaction,
  onDeleteTransaction,
  onAddIncome,
  onAddBill,
}: LeftSidebarProps) {
  const [, setLocation] = useLocation();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showRemindersDialog, setShowRemindersDialog] = useState(false);
  const [showDatabaseSyncDialog, setShowDatabaseSyncDialog] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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

  const handleRefresh = () => {
    window.location.reload();
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

      <div className={`
        fixed inset-y-0 left-0 z-40 w-[200px] bg-background border-r transform 
        lg:relative lg:translate-x-0 lg:w-auto
        transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        overflow-y-auto h-screen lg:h-auto
      `}>
        <div className="p-4 space-y-6 pt-16 lg:pt-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold px-2">Expenses</h2>
            <div className="space-y-2">
              <Select onValueChange={(value) => {
                const bill = bills.find(b => b.id === parseInt(value));
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
                    <SelectItem key={bill.id} value={bill.id.toString()}>
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
                const bill = bills.find(b => b.id === parseInt(value));
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
                    <SelectItem key={bill.id} value={bill.id.toString()}>
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

          <div className="space-y-2">
            <h2 className="text-lg font-semibold px-2">Categories</h2>
            <div className="space-y-2">
              <Link href="/categories" onClick={() => setIsOpen(false)}>
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

          <div className="space-y-2">
            <h2 className="text-lg font-semibold px-2">Reports</h2>
            <div className="space-y-2">
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
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Monthly up today
                </Button>
              </Link>
              <Link href="/reports/monthly" onClick={() => setIsOpen(false)}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                >
                  <ChartBar className="mr-2 h-4 w-4" />
                  Monthly Report
                </Button>
              </Link>
              <Link href="/reports/annual" onClick={() => setIsOpen(false)}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                >
                  <CalendarRange className="mr-2 h-4 w-4" />
                  Annual Report
                </Button>
              </Link>
              <Link href="/reports/date-range" onClick={() => setIsOpen(false)}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                >
                  <FileBarChart className="mr-2 h-4 w-4" />
                  Date Range Report
                </Button>
              </Link>
              <Link href="/reports/income" onClick={() => setIsOpen(false)}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Income Report
                </Button>
              </Link>
              <Link href="/reports/expenses" onClick={() => setIsOpen(false)}>
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