/**
 * ================================================
 * 🎯 Budget Component
 * ================================================
 * A comprehensive budget tracking interface that displays and manages
 * income and expenses in a calendar view.
 */

import { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Income, Bill } from "@/types";
import { cn, generateId } from "@/lib/utils";
import { LeftSidebar } from "@/components/LeftSidebar";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useData } from "@/contexts/DataContext";
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
import { formatCurrency } from "@/lib/utils";

dayjs.extend(isBetween);

type OccurrenceType = 'once' | 'monthly' | 'biweekly' | 'twice-monthly';

const Budget = () => {
  const { incomes, bills, addIncome, addBill, deleteTransaction, editTransaction, resetData } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(dayjs().date());
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month());
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  const [isAddingBill, setIsAddingBill] = useState(false);
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Income | Bill | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isResettingData, setIsResettingData] = useState(false);

  const handleAddIncome = (income: Omit<Income, "id">) => {
    addIncome({ ...income, id: generateId() });
  }

  const handleAddBill = (bill: Omit<Bill, "id">) => {
    addBill({ ...bill, id: generateId() });
  }

  const handleDeleteTransaction = (transaction: Income | Bill) => {
    setShowDeleteConfirmation(true);
    setEditingTransaction(transaction);
  }

  const handleEditTransaction = (transaction: Income | Bill) => {
    setIsEditingTransaction(true);
    setEditingTransaction(transaction);
  }


  const handleReset = () => {
    setIsResettingData(true);
    resetData();
  }

  const handleConfirmDelete = () => {
    if (editingTransaction) {
      deleteTransaction(editingTransaction);
    }
    setShowDeleteConfirmation(false);
    setEditingTransaction(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setEditingTransaction(null);
  };

  const today = dayjs();
  const firstDayOfMonth = dayjs().year(selectedYear).month(selectedMonth).startOf("month");
  const lastDayOfMonth = dayjs().year(selectedYear).month(selectedMonth).endOf("month");
  const firstDayIndex = firstDayOfMonth.day();
  const totalDaysInMonth = lastDayOfMonth.date();
  const calendarDays = Array.from({ length: 6 * 7 }, (_, index) => {
    const day = index - firstDayIndex + 1;
    return day >= 1 && day <= totalDaysInMonth ? day : null;
  });

  const isCurrentDay = (day: number) => {
    return day === today.date() && selectedMonth === today.month() && selectedYear === today.year();
  };


  const getIncomeForDay = (day: number) => {
    return incomes.filter(income => dayjs(income.date).date() === day && dayjs(income.date).month() === selectedMonth && dayjs(income.date).year() === selectedYear);
  }

  const getBillsForDay = (day: number) => {
    return bills.filter(bill => dayjs(bill.dueDate).date() === day && dayjs(bill.dueDate).month() === selectedMonth && dayjs(bill.dueDate).year() === selectedYear);
  }

  const calculateTotalsUpToDay = (day: number) => {
    let totalIncome = 0;
    let totalBills = 0;
    incomes.forEach(income => {
      if (dayjs(income.date).isBefore(dayjs().year(selectedYear).month(selectedMonth).date(day)) || dayjs(income.date).isSame(dayjs().year(selectedYear).month(selectedMonth).date(day)) ) {
        totalIncome += income.amount;
      }
    });
    bills.forEach(bill => {
      if (dayjs(bill.dueDate).isBefore(dayjs().year(selectedYear).month(selectedMonth).date(day)) || dayjs(bill.dueDate).isSame(dayjs().year(selectedYear).month(selectedMonth).date(day)) ) {
        totalBills += bill.amount;
      }
    });
    return { totalIncome, totalBills };
  };

  const handleDayClick = (day: number | null) => {
    if (day) {
      setSelectedDay(day);
      setShowDailySummary(true);
    }
  };


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
                                "font-medium text-base lg:text-lg relative",
                                "px-1.5 py-0.5 rounded",
                                "bg-background/95 backdrop-blur-sm", 
                                selectedDay === dayNumber && "bg-accent-foreground/10",
                                isCurrentDay(dayNumber) && "text-primary font-bold"
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
                    </tr>
                  ))}
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
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogContent>
          <AlertDialogDescription>
            Are you sure you want to delete this transaction? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogContent>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </div>
  );
};

export default Budget;