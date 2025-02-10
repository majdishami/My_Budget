/**
 * ================================================
 * 🎯 Budget Component
 * ================================================
 * A comprehensive budget tracking interface that displays and manages
 * income and expenses in a calendar view.
 */

import { useState } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Income, Bill } from "@/types";
import { cn, generateId, formatCurrency } from "@/lib/utils";
import { LeftSidebar } from "@/components/LeftSidebar";
import { Card } from "@/components/ui/card";
import { useData } from "@/contexts/DataContext";
import DailySummaryDialog from "@/components/DailySummaryDialog";
import EditExpenseDialog from "@/components/EditExpenseDialog";
import { Menu, X } from "lucide-react";
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

dayjs.extend(isBetween);

export function Budget() {
  const { incomes, bills, addIncome, addBill, deleteTransaction, editTransaction, resetData } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Set today to February 9, 2025
  const today = dayjs('2025-02-09');
  const [selectedDay, setSelectedDay] = useState(today.date());
  const [selectedMonth, setSelectedMonth] = useState(today.month());
  const [selectedYear, setSelectedYear] = useState(today.year());
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Income | Bill | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showEditExpenseDialog, setShowEditExpenseDialog] = useState(false);

  const handleAddIncome = () => {
    addIncome({ source: "", amount: 0, date: dayjs().toISOString() });
  };

  const handleAddBill = () => {
    addBill({ name: "", amount: 0, day: dayjs().date(), dueDate: dayjs().toISOString() });
  };

  const handleDeleteTransaction = (type: 'income' | 'bill', transaction: Income | Bill) => {
    setShowDeleteConfirmation(true);
    setEditingTransaction(transaction);
  };

  const handleEditTransaction = (type: 'income' | 'bill', transaction: Income | Bill) => {
    if (type === 'bill') {
      setEditingTransaction(transaction);
      setShowEditExpenseDialog(true);
    } else {
      editTransaction(transaction);
    }
  };

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

  const firstDayOfMonth = dayjs().year(selectedYear).month(selectedMonth).startOf("month");
  const lastDayOfMonth = dayjs().year(selectedYear).month(selectedMonth).endOf("month");
  const firstDayIndex = firstDayOfMonth.day(); // Sunday = 0, Monday = 1, etc.
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

  const years = Array.from({ length: 21 }, (_, i) => today.year() - 10 + i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: dayjs().month(i).format("MMMM")
  }));

  const handleMonthChange = (newMonth: number) => {
    setSelectedMonth(newMonth);
  };

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
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

      {/* Sidebar Navigation */}
      <aside
        className={cn(
          "w-64 border-r p-2 bg-muted/30 fixed top-0 bottom-0 overflow-y-auto transition-transform duration-200 ease-in-out lg:translate-x-0 z-30",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="pt-12 lg:pt-0">
          <LeftSidebar
            incomes={incomes}
            bills={bills}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onAddIncome={handleAddIncome}
            onAddBill={handleAddBill}
            onReset={resetData}
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

      {/* Main Content Area */}
      <main className="w-full lg:pl-64 flex flex-col min-h-screen">
        <div className="flex-1 p-2 lg:p-4 overflow-y-auto">
          <Card className="w-full mb-4">
            <div className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold mb-2">
                    Budget Calendar - {dayjs().month(selectedMonth).format("MMMM")} {selectedYear}
                  </h1>
                  <div className="flex gap-2">
                    <select
                      value={selectedMonth}
                      onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                      className="p-2 border rounded bg-background"
                    >
                      {months.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedYear}
                      onChange={(e) => handleYearChange(parseInt(e.target.value))}
                      className="p-2 border rounded bg-background"
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Month Total Income</p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(calculateTotalsUpToDay(totalDaysInMonth).totalIncome)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Month Total Bills</p>
                    <p className="text-lg font-semibold text-red-600">
                      {formatCurrency(calculateTotalsUpToDay(totalDaysInMonth).totalBills)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Month Net Balance</p>
                    <p className={`text-lg font-semibold ${
                      calculateTotalsUpToDay(totalDaysInMonth).totalIncome - calculateTotalsUpToDay(totalDaysInMonth).totalBills >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}>
                      {formatCurrency(
                        calculateTotalsUpToDay(totalDaysInMonth).totalIncome -
                        calculateTotalsUpToDay(totalDaysInMonth).totalBills
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="w-full">
            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse text-sm lg:text-base">
                <thead className="sticky top-0 bg-background z-10">
                  <tr>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
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
                              "hover:bg-accent",
                              isCurrentDay(dayNumber) && "ring-2 ring-primary ring-offset-2 border-primary",
                              selectedDay === dayNumber && "bg-accent/50 font-semibold",
                              hasTransactions && "shadow-sm"
                            )}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className={cn(
                                "font-medium text-base lg:text-lg",
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
                            <div className="space-y-0.5 text-xs">
                              {dayIncomes.map((income, index) => (
                                <div
                                  key={income.id}
                                  className="flex justify-between items-center text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded px-1"
                                >
                                  <span className="truncate max-w-[60%]">
                                    {index + 1}. {income.source}
                                  </span>
                                  <span className="font-medium shrink-0">
                                    {formatCurrency(income.amount)}
                                  </span>
                                </div>
                              ))}
                              {dayBills.map((bill, index) => (
                                <div
                                  key={bill.id}
                                  className="flex justify-between items-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded px-1"
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

      {/* Dialogs */}
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

      <EditExpenseDialog
        isOpen={showEditExpenseDialog}
        onOpenChange={setShowEditExpenseDialog}
        expense={editingTransaction as Bill}
        onUpdate={(updatedBill) => {
          editTransaction(updatedBill);
          setShowEditExpenseDialog(false);
          setEditingTransaction(null);
        }}
      />

      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Are you sure you want to delete this transaction? This action cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}