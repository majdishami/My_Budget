/**
 * ================================================
 * 🎯 Budget Component
 * ================================================
 * A comprehensive budget tracking interface that displays and manages
 * income and expenses in a calendar view.
 * 
 * Core Features:
 * 🗓️ Monthly calendar view with daily transaction details
 * 💰 Income and expense management
 * 📊 Running balance calculations
 * 🖱️ Interactive day selection
 * 📱 Mobile-responsive sidebar access
 * 
 * Component Structure:
 * - Main layout with sidebar and calendar grid
 * - Monthly summary cards
 * - Interactive transaction management
 * - Responsive design optimizations
 */

import { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Income, Bill } from "@/types";
import { cn } from "@/lib/utils";
import { LeftSidebar } from "@/components/LeftSidebar";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import DailySummaryDialog from "@/components/DailySummaryDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Menu, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { EditIncomeDialog } from "@/components/EditIncomeDialog";
import { EditExpenseDialog } from "@/components/EditExpenseDialog";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { AddIncomeDialog } from "@/components/AddIncomeDialog";

dayjs.extend(isBetween);

/**
 * 📅 Transaction Occurrence Types
 * Defines how often a transaction repeats
 */
type OccurrenceType = 'once' | 'monthly' | 'biweekly' | 'twice-monthly';

/**
 * 💰 Currency Formatting Helper
 * Formats numbers as USD currency without cents
 */
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(amount));
};

const Budget = () => {
  // 🕒 Time Management
  const today = dayjs(); // Use current date instead of hardcoded one

  // 📊 State Management
  const [selectedYear, setSelectedYear] = useState(today.year());
  const [selectedMonth, setSelectedMonth] = useState(today.month());
  const [selectedDay, setSelectedDay] = useState<number>(today.date());
  const [showDayDialog, setShowDayDialog] = useState(false);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddBillDialog, setShowAddBillDialog] = useState(false);
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [showEditIncomeDialog, setShowEditIncomeDialog] = useState(false);
  const [showAddIncomeDialog, setShowAddIncomeDialog] = useState(false);
  const [deletingIncome, setDeletingIncome] = useState<Income | null>(null);
  const [showDeleteIncomeDialog, setShowDeleteIncomeDialog] = useState(false);
  const [addIncomeDate, setAddIncomeDate] = useState<Date>(new Date());
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);


  /**
   * 🔄 Initialize Default Data
   * Sets up initial income and bill data if none exists
   */
  useEffect(() => {
    const storedIncomes = localStorage.getItem("incomes");
    const storedBills = localStorage.getItem("bills");

    // 💵 Initialize Default Incomes
    if (!storedIncomes) {
      const today = dayjs();
      const sampleIncomes: Income[] = [
        // Majdi's bi-monthly salary
        { id: "1", source: "Majdi's Salary", amount: Math.round(4739), date: today.date(1).toISOString() },
        { id: "2", source: "Majdi's Salary", amount: Math.round(4739), date: today.date(15).toISOString() },
        // Ruba's bi-weekly salary - starting from the next Friday
        { id: "3", source: "Ruba's Salary", amount: Math.round(2168), date: today.day(5).toISOString() }
      ];
      setIncomes(sampleIncomes);
      localStorage.setItem("incomes", JSON.stringify(sampleIncomes));
    } else {
      setIncomes(JSON.parse(storedIncomes).map((income: Income) => ({
        ...income,
        amount: Math.round(income.amount)
      })));
    }

    // 💸 Initialize Default Bills
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
    } else {
      setBills(JSON.parse(storedBills).map((bill: Bill) => ({
        ...bill,
        amount: Math.round(bill.amount)
      })));
    }
  }, []);

  /**
   * 📅 Income Calculation for Specific Day
   * Handles both regular and bi-weekly income patterns
   */
  const getIncomeForDay = (day: number) => {
    if (day <= 0 || day > daysInMonth) return [];

    const currentDate = dayjs()
      .year(selectedYear)
      .month(selectedMonth)
      .date(day);

    return incomes.filter(income => {
      const incomeDate = dayjs(income.date);

      // 🔄 Special handling for Ruba's bi-weekly salary
      if (income.source === "Ruba's Salary") {
        // Must be a Friday
        if (currentDate.day() !== 5) return false;

        // Calculate from the next Friday
        const startDate = dayjs().day(5);
        const weeksDiff = currentDate.diff(startDate, 'week');

        // Only include if it's an even number of weeks from start
        return weeksDiff >= 0 && weeksDiff % 2 === 0;
      }

      // Regular monthly income check
      return incomeDate.date() === day;
    });
  };

  const getBillsForDay = (day: number) => {
    if (day <= 0 || day > daysInMonth) return [];
    return bills.filter(bill => bill.day === day);
  };

  const firstDayOfMonth = useMemo(() => {
    return dayjs(`${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-01`);
  }, [selectedYear, selectedMonth]);

  const daysInMonth = useMemo(() => {
    return firstDayOfMonth.daysInMonth();
  }, [firstDayOfMonth]);

  const firstDayOfWeek = useMemo(() => {
    // Convert Sunday=0 to Monday=0 by shifting the day number
    const day = firstDayOfMonth.day();
    return day === 0 ? 6 : day - 1; // Sunday becomes 6, other days shift down by 1
  }, [firstDayOfMonth]);

  /**
   * 🧮 Calculate Running Totals
   * Computes the cumulative income and expenses up to a given day.
   */
  const calculateTotalsUpToDay = (day: number) => {
    let totalIncome = 0;
    let totalBills = 0;

    // Calculate for each day up to the selected day
    for (let currentDay = 1; currentDay <= day; currentDay++) {
      // Add incomes for the day
      const dayIncomes = getIncomeForDay(currentDay);
      totalIncome += dayIncomes.reduce((sum, income) => sum + income.amount, 0);

      // Add bills for the day
      const dayBills = getBillsForDay(currentDay);
      totalBills += dayBills.reduce((sum, bill) => sum + bill.amount, 0);
    }

    return { totalIncome, totalBills };
  };

  const handleDayClick = (day: number) => {
    if (day > 0 && day <= daysInMonth) {
      setSelectedDay(day);
      setShowDailySummary(true);
    }
  };

  /**
   * Check if a given day is the current day
   */
  const isCurrentDay = (day: number) => {
    return day === today.date() &&
           selectedMonth === today.month() &&
           selectedYear === today.year();
  };

  const calendarDays = useMemo(() => {
    const totalDays = 42; // 6 weeks × 7 days
    return Array.from({ length: totalDays }, (_, index) => {
      const adjustedIndex = index - firstDayOfWeek;
      return adjustedIndex >= 0 && adjustedIndex < daysInMonth ? adjustedIndex + 1 : null;
    });
  }, [daysInMonth, firstDayOfWeek]);

  /**
   * 🧮 Monthly Totals Calculation
   * Calculates the total income and expenses for the selected month.
   * Handles the complexities of bi-weekly income calculations.
   */
  const monthlyTotals = useMemo(() => {
    let totalIncome = 0;
    let totalBills = 0;

    // Calculate total income for the selected month
    incomes.forEach(income => {
      const incomeDate = dayjs(income.date);

      if (income.source === "Ruba's Salary") {
        // For bi-weekly salary, check each Friday in the month
        const firstDayOfMonth = dayjs().year(selectedYear).month(selectedMonth).startOf('month');
        const lastDayOfMonth = firstDayOfMonth.endOf('month');
        // Use January 10, 2025 as the fixed start date for bi-weekly calculations
        const startDate = dayjs('2025-01-10');

        // Iterate through each day in the month
        let currentDate = firstDayOfMonth;
        while (currentDate.isBefore(lastDayOfMonth) || currentDate.isSame(lastDayOfMonth, 'day')) {
          // Check if it's a Friday and matches bi-weekly schedule
          if (currentDate.day() === 5) { // Friday
            const weeksDiff = currentDate.diff(startDate, 'week');
            if (weeksDiff >= 0 && weeksDiff % 2 === 0) {
              totalIncome += income.amount;
            }
          }
          currentDate = currentDate.add(1, 'day');
        }
      } else {
        // For regular monthly incomes (Majdi's salary)
        const adjustedDate = dayjs()
          .year(selectedYear)
          .month(selectedMonth)
          .date(incomeDate.date());

        // Only count if the day exists in the current month
        if (adjustedDate.month() === selectedMonth) {
          totalIncome += income.amount;
        }
      }
    });

    // Calculate total bills for the selected month
    bills.forEach(bill => {
      totalBills += bill.amount;
    });

    return {
      totalIncome,
      totalBills,
      balance: totalIncome - totalBills
    };
  }, [incomes, bills, selectedMonth, selectedYear]);

  /**
   * 📅 Transaction Management
   * Handles all transaction-related operations including:
   * - Adding new transactions
   * - Editing existing entries
   * - Deleting records
   * - Calculating running totals
   */
  const handleEditTransaction = (type: 'income' | 'bill', data: Income | Bill) => {
    if (type === 'income') {
      setEditingIncome(data as Income);
      setShowEditIncomeDialog(true);
    } else if (type === 'bill') {
      setEditingBill(data as Bill);
      setShowEditDialog(true);
    }
  };

  const handleDeleteTransaction = (type: 'income' | 'bill', data: Income | Bill) => {
    if (type === 'income') {
      setDeletingIncome(data as Income);
      setShowDeleteIncomeDialog(true);
    } else {
      setDeletingBill(data as Bill);
      setShowDeleteDialog(true);
    }
  };

  const confirmDelete = () => {
    if (deletingBill) {
      const newBills = bills.filter(b => b.id !== deletingBill.id);
      setBills(newBills);
      localStorage.setItem("bills", JSON.stringify(newBills));
      setShowDeleteDialog(false);
      setDeletingBill(null);
    }
  };

  /**
   * 💾 Data Persistence Layer
   * Manages local storage operations for:
   * - Saving transaction updates
   * - Loading stored data
   * - Maintaining data consistency
   */
  const handleConfirmIncomeEdit = (updatedIncome: Income) => {
    const newIncomes = incomes.map(income => {
      // If it's the same income source, update all occurrences
      if (income.source === editingIncome?.source) {
        return {
          ...income,
          source: updatedIncome.source,
          amount: updatedIncome.amount,
        };
      }
      return income;
    });

    setIncomes(newIncomes);
    localStorage.setItem("incomes", JSON.stringify(newIncomes));
    setShowEditIncomeDialog(false);
    setEditingIncome(null);
  };

  const confirmIncomeDelete = () => {
    if (deletingIncome) {
      // Remove all occurrences of the income source
      const newIncomes = incomes.filter(i => i.source !== deletingIncome.source);
      setIncomes(newIncomes);
      localStorage.setItem("incomes", JSON.stringify(newIncomes));
      setShowDeleteIncomeDialog(false);
      setDeletingIncome(null);
    }
  };


  const handleAddIncome = () => {
    setShowAddIncomeDialog(true);
  };

  /**
   * ➕ Add New Income
   * Handles adding new income entries with different recurrence options.
   */
  const handleConfirmAddIncome = (newIncome: Omit<Income, 'id'> & { occurrenceType: OccurrenceType }) => {
    const { occurrenceType, ...incomeData } = newIncome;
    const baseId = (incomes.length + 1).toString();
    const newIncomes: Income[] = [];
    const startDate = dayjs(newIncome.date);

    switch (occurrenceType) {
      case 'once':
        newIncomes.push({
          ...incomeData,
          id: baseId
        });
        break;

      case 'monthly':
        // Add income for the next 12 months
        for (let i = 0; i < 12; i++) {
          const date = startDate.add(i, 'month');
          newIncomes.push({
            ...incomeData,
            id: `${baseId}-${i}`,
            date: date.toISOString()
          });
        }
        break;

      case 'biweekly':
        // Add bi-weekly income for the next 6 months
        let biweeklyDate = startDate;
        for (let i = 0; biweeklyDate.diff(startDate, 'month') < 6; i++) {
          newIncomes.push({
            ...incomeData,
            id: `${baseId}-${i}`,
            date: biweeklyDate.toISOString()
          });
          biweeklyDate = biweeklyDate.add(2, 'week');
        }
        break;

      case 'twice-monthly':
        // Add income for the 1st and 15th of each month for the next 6 months
        for (let i = 0; i < 6; i++) {
          const month = startDate.add(i, 'month');
          // First of the month
          newIncomes.push({
            ...incomeData,
            id: `${baseId}-${i}-1`,
            date: month.date(1).toISOString()
          });
          // 15th of the month
          newIncomes.push({
            ...incomeData,
            id: `${baseId}-${i}-2`,
            date: month.date(15).toISOString()
          });
        }
        break;
    }

    const updatedIncomes = [...incomes, ...newIncomes];
    setIncomes(updatedIncomes);
    localStorage.setItem("incomes", JSON.stringify(updatedIncomes));
    setShowAddIncomeDialog(false);
  };

  const handleAddBill = () => {
    setShowAddExpenseDialog(true);
  };

  /**
   * ➕ Add New Bill
   * Handles adding a new bill entry.
   */
  const handleConfirmAddBill = (newBill: Omit<Bill, 'id'>) => {
    const bill: Bill = {
      ...newBill,
      id: (bills.length + 1).toString()
    };
    const newBills = [...bills, bill];
    setBills(newBills);
    localStorage.setItem("bills", JSON.stringify(newBills));
    setShowAddExpenseDialog(false);
  };

  const handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  const years = useMemo(() => {
    const currentYear = today.year();
    return Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
  }, [today]);

  const months = useMemo(() => (
    Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: dayjs().month(i).format("MMMM")
    }))
  ), []);

  const handleMonthChange = (newMonth: number) => {
    setSelectedMonth(newMonth);
    setSelectedDay(1); // Reset to first day of new month
  };

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    setSelectedDay(1); // Reset to first day of new year
  };

  const handleConfirmBillEdit = (updatedBill: Bill) => {
    const newBills = bills.map(bill =>
      bill.id === updatedBill.id ? updatedBill : bill
    );
    setBills(newBills);
    localStorage.setItem("bills", JSON.stringify(newBills));
    setShowEditDialog(false);
    setEditingBill(null);
  };

  /**
   * 🎨 UI Rendering Section
   * Creates the visual structure of the budget interface:
   * - Responsive grid layout
   * - Transaction cards
   * - Interactive elements
   * - Mobile optimizations
   */
  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile Menu Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-2 left-2 z-40 lg:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </Button>

      {/* 📱 Sidebar Navigation - Now collapsible on mobile */}
      <aside
        className={cn(
          "w-64 border-r p-2 bg-muted/30 fixed top-0 bottom-0 overflow-y-auto transition-transform duration-200 ease-in-out lg:translate-x-0 z-30",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="pt-12 lg:pt-0"> {/* Reduced padding for mobile */}
          <LeftSidebar
            incomes={incomes}
            bills={bills}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onAddIncome={handleAddIncome}
            onAddBill={handleAddBill}
            onReset={handleReset}
          />
        </div>
      </aside>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 📊 Main Content Area */}
      <main className="w-full lg:pl-64 flex flex-col min-h-screen">
        {/* 🗓️ Calendar Header */}
        <Card className="p-2 lg:p-4 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 lg:gap-4">
            <div className="space-y-1 lg:space-y-2 pl-8 lg:pl-0"> {/* Added left padding for menu button */}
              <div className="flex items-center gap-2">
                <h1 className="text-sm lg:text-2xl font-bold truncate">
                  Budget - {dayjs().month(selectedMonth).format("MMM")} {selectedYear}
                </h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.location.reload()}
                  className="h-8 w-8 lg:hidden" // Only show on mobile
                  aria-label="Refresh page"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-1 lg:gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                  className="p-1 lg:p-2 border rounded bg-background min-w-[100px] lg:min-w-[120px] text-xs lg:text-base touch-manipulation"
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
                  className="p-1 lg:p-2 border rounded bg-background min-w-[80px] lg:min-w-[100px] text-xs lg:text-base touch-manipulation"
                  aria-label="Select year"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                  className="p-1 lg:p-2 border rounded bg-background min-w-[60px] lg:min-w-[80px] text-xs lg:text-base touch-manipulation"
                  aria-label="Select day"
                >
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>
                      {day.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 🧮 Monthly Totals Display - Responsive layout */}
            <div className="flex flex-wrap items-center gap-3 lg:gap-6">
              <ThemeToggle />
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Total Net Income</p>
                <p className="text-base lg:text-lg font-semibold text-green-600">
                  {formatCurrency(monthlyTotals.totalIncome)}
                </p>
              </div>
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Total Bills</p>
                <p className="text-base lg:text-lg font-semibold text-red-600">
                  {formatCurrency(monthlyTotals.totalBills)}
                </p>
              </div>
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Net Balance</p>
                <p className={`text-base lg:text-lg font-semibold ${
                  monthlyTotals.balance >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {formatCurrency(monthlyTotals.balance)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* 🗓️ Calendar Grid - Mobile optimized */}
        <div className="flex-1 p-2 lg:p-4 overflow-y-auto">
          <Card className="w-full">
            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse text-sm lg:text-base">
                <thead className="sticky top-0 bg-background z-10">
                  <tr>
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                      <th key={day} className="p-1 lg:p-2 text-center font-medium text-muted-foreground border w-[14.28%]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Array.from({ length: 6 }, (_, weekIndex) => (
                    <tr key={weekIndex} className="divide-x">
                      {Array.from({ length: 7 }, (_, dayIndex) => {
                        const dayNumber = calendarDays[weekIndex * 7 + dayIndex];
                        if (dayNumber === null) {
                          return <td key={dayIndex} className="border p-1 lg:p-2 bg-muted/10 h-24 lg:h-48" />;
                        }

                        const dayIncomes = getIncomeForDay(dayNumber);
                        const dayBills = getBillsForDay(dayNumber);
                        const hasTransactions = dayIncomes.length > 0 || dayBills.length > 0;

                        return (
                          <td
                            key={dayIndex}
                            onClick={() => handleDayClick(dayNumber)}
                            aria-label={`${dayNumber} ${dayjs().month(selectedMonth).format("MMMM")} ${selectedYear}${isCurrentDay(dayNumber) ? ' (Today)' : ''}`}
                            className={cn(
                              "border p-1 lg:p-2 align-top cursor-pointer transition-colors h-24 lg:h-48 relative touch-manipulation",
                              "active:bg-accent/70",
                              "hover:bg-accent",
                              isCurrentDay(dayNumber) && [
                                "ring-2 ring-primary ring-offset-2",
                                "border-primary",
                                "bg-primary/10",
                                "relative",
                                "after:content-['Today'] after:absolute after:top-1 after:right-1",
                                "after:text-[10px] after:font-medium after:text-primary",
                                "after:px-1 after:py-0.5 after:rounded after:bg-primary/10",
                                "before:content-[''] before:absolute before:-inset-[2px]",
                                "before:border-2 before:border-primary before:rounded-sm"
                              ],
                              selectedDay === dayNumber && "bg-accent/50",
                              hasTransactions && "shadow-sm"
                            )}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className={cn(
                                "font-medium text-base lg:text-lg z-10 relative", // Added z-10 and relative to ensure visibility
                                isCurrentDay(dayNumber) && "text-primary font-bold",
                                selectedDay === dayNumber && "text-foreground" // Ensure text is visible when selected
                              )}>
                                {dayNumber}
                              </span>
                              {hasTransactions && (
                                <div className="flex gap-1">
                                  {dayIncomes.length > 0 && (
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                  )}
                                  {dayBills.length > 0 && (
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="space-y-0.5 text-[10px] lg:text-xs overflow-y-auto max-h-[calc(100%-2rem)]">
                              {dayIncomes.length > 0 && (
                                <div className="space-y-0.5">
                                  <p className="font-medium text-green-600 dark:text-green-400">Income</p>
                                  {dayIncomes.map((income, index) => (
                                    <div
                                      key={income.id}
                                      className="flex justify-between items-center text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded px-1 py-0.5 touch-manipulation"
                                    >
                                      <span className="truncate max-w-[60%]">
                                        {index + 1}. {income.source}
                                      </span>
                                      <span className="font-medium shrink-0">
                                        {formatCurrency(income.amount)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {dayBills.length > 0 && (
                                <div className="space-y-0.5">
                                  <p className="font-medium text-red-600 dark:text-red-400">Expenses</p>
                                  {dayBills.map((bill, index) => (
                                    <div
                                      key={bill.id}
                                      className="flex justify-between items-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded px-1 py-0.5 touch-manipulation"
                                    >
                                      <span className="truncate max-w-[60%]">
                                        {index + 1}. {bill.name}
                                      </span>
                                      <span className="font-medium shrink-0">
                                        {formatCurrency(bill.amount)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>

      {/* 💬 Dialogs for Daily Summary, Income/Expense Editing, and Deletion */}
      <DailySummaryDialog
        isOpen={showDailySummary}
        onOpenChange={setShowDailySummary}
        selectedDay={selectedDay}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        dayIncomes={getIncomeForDay(selectedDay)}
        dayBills={getBillsForDay(selectedDay)}
        totalIncomeUpToToday={calculateTotalsUpToDay(selectedDay).totalIncome}
        totalBillsUpToToday={calculateTotalsUpToDay(selectedDay).totalBills}
      />

      <EditIncomeDialog
        income={editingIncome}
        isOpen={showEditIncomeDialog}
        onOpenChange={setShowEditIncomeDialog}
        onConfirm={handleConfirmIncomeEdit}
      />

      <EditExpenseDialog
        bill={editingBill}
        isOpen={showEditDialog}
        onOpenChange={setShowEditDialog}
        onConfirm={handleConfirmBillEdit}
      />

      <AddExpenseDialog
        isOpen={showAddExpenseDialog}
        onOpenChange={setShowAddExpenseDialog}
        onConfirm={handleConfirmAddBill}
      />

      <AddIncomeDialog
        isOpen={showAddIncomeDialog}
        onOpenChange={setShowAddIncomeDialog}
        onConfirm={handleConfirmAddIncome}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>Are you sure you want to delete this expense? This action cannot be undone.</p>
              {deletingBill && (
                <div className="mt-4 space-y-2 border rounded-lg p-4 bg-muted/30">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Name:</span>
                    <span>{deletingBill.name}</span>
                    <span className="font-medium">Amount:</span>
                    <span>{formatCurrency(deletingBill.amount)}</span>
                    <span className="font-medium">Day of Month:</span>
                    <span>{deletingBill.day}</span>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setDeletingBill(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteIncomeDialog} onOpenChange={setShowDeleteIncomeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Income</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>Are you sure you want to delete this income? This will remove all occurrences of this income. This action cannot be undone.</p>
              {deletingIncome && (
                <div className="mt-4 space-y-2 border rounded-lg p-4 bg-muted/30">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Source:</span>
                    <span>{deletingIncome.source}</span>
                    <span className="font-medium">Amount:</span>
                    <span>{formatCurrency(deletingIncome.amount)}</span>
                    <span className="font-medium">Date:</span>
                    <span>{dayjs(deletingIncome.date).format('MMMM D, YYYY')}</span>
                    {deletingIncome.source === "Ruba's Salary" && (
                      <>
                        <span className="font-medium">Type:</span>
                        <span>Bi-weekly (Every other Friday)</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteIncomeDialog(false);
              setDeletingIncome(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmIncomeDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Budget;