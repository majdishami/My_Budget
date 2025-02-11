/**
 * ================================================
 * 🎯 Budget Component
 * ================================================
 */

import { useState } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Income, Bill } from "@/types";
import { cn, formatCurrency } from "@/lib/utils";
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

const generateId = () => crypto.randomUUID(); //Added function


export function Budget() {
  const { incomes, bills, addIncome, addBill, deleteTransaction, editTransaction, resetData } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(dayjs().date());
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Income | Bill | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showEditExpenseDialog, setShowEditExpenseDialog] = useState(false);

  // Set today to February 9, 2025
  const today = dayjs('2025-02-09');

  const handleAddIncome = () => {
    const newIncome: Income = {
      id: generateId(),
      source: "",
      amount: 0,
      date: dayjs().toISOString()
    };
    addIncome(newIncome);
  };

  const handleAddBill = () => {
    const newBill: Bill = {
      id: generateId(),
      name: "",
      amount: 0,
      day: dayjs().date(),
      category_id: 1,
      user_id: 1,
      created_at: dayjs().toISOString(),
      isOneTime: false
    };
    addBill(newBill);
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

  const firstDayOfMonth = dayjs().startOf("month");
  const lastDayOfMonth = dayjs().endOf("month");
  const firstDayIndex = firstDayOfMonth.day();
  const totalDaysInMonth = lastDayOfMonth.date();
  const calendarDays = Array.from({ length: 6 * 7 }, (_, index) => {
    const day = index - firstDayIndex + 1;
    return day >= 1 && day <= totalDaysInMonth ? day : null;
  });

  const isCurrentDay = (day: number) => {
    return day === today.date();
  };

  // Calculate all income occurrences for the current month
  const getMonthlyIncomeOccurrences = () => {
    const currentDate = dayjs();
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startDate = dayjs('2025-01-10');

    const occurrences: Income[] = [];

    incomes.forEach(income => {
      if (income.source === "Ruba's Salary") {
        // Calculate bi-weekly occurrences
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
        // Regular monthly incomes
        const incomeDate = dayjs(income.date);
        occurrences.push({
          ...income,
          date: incomeDate.toISOString()
        });
      }
    });

    return occurrences;
  };

  const getIncomeForDay = (day: number) => {
    const monthlyIncomes = getMonthlyIncomeOccurrences();
    const targetDate = dayjs().date(day);

    return monthlyIncomes.filter(income => {
      const incomeDate = dayjs(income.date);
      return incomeDate.date() === day;
    });
  }

  const getBillsForDay = (day: number) => {
    const targetDate = dayjs().date(day);
    return bills.filter(bill => {
      if (bill.isOneTime) {
        // For one-time bills, check exact date match
        const billDate = dayjs(bill.date);
        return billDate && billDate.date() === day;
      } else {
        // For recurring bills, check if the day matches
        return bill.day === day;
      }
    });
  }

  const calculateTotalsUpToDay = (day: number) => {
    let totalIncome = 0;
    let totalBills = 0;

    // Calculate target date
    const targetDate = dayjs().date(day);

    // Calculate income using monthly occurrences
    const monthlyIncomes = getMonthlyIncomeOccurrences();
    monthlyIncomes.forEach(income => {
      const incomeDate = dayjs(income.date);
      if (incomeDate.date() <= day) {
        totalIncome += income.amount;
      }
    });

    // Calculate bills
    bills.forEach(bill => {
      if (bill.isOneTime) {
        // For one-time bills
        const billDate = dayjs(bill.date);
        if (billDate.isSame(targetDate, 'month')) {
          if (billDate.date() <= day) {
            totalBills += bill.amount;
          }
        }
      } else {
        // For recurring bills
        if (bill.day <= day) {
          totalBills += bill.amount;
        }
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
    <div className="w-full">
      <Card className="w-full mb-4">
        <div className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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
                        aria-label={`${dayNumber} ${dayjs().format("MMMM")} ${today.year()}${isCurrentDay(dayNumber) ? ' (Today)' : ''}`}
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

      {/* Dialogs */}
      <DailySummaryDialog
        isOpen={showDailySummary}
        onOpenChange={setShowDailySummary}
        selectedDay={selectedDay}
        selectedMonth={dayjs().month()}
        selectedYear={today.year()}
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