/**
 * ================================================
 * 🎯 Budget Component
 * ================================================
 */

import { useState } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Income, Bill } from "@/types";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { useData } from "@/contexts/DataContext";
import DailySummaryDialog from "@/components/DailySummaryDialog";
import EditExpenseDialog from "@/components/EditExpenseDialog";
import { Menu, X, Calendar, Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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

dayjs.extend(isBetween);

const generateId = () => crypto.randomUUID();

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export function Budget() {
  const { incomes, bills, addIncome, addBill, deleteTransaction, editTransaction, resetData } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const today = dayjs('2025-02-11');
  const [selectedDay, setSelectedDay] = useState(today.date());
  const [selectedMonth, setSelectedMonth] = useState(today.month());
  const [selectedYear, setSelectedYear] = useState(today.year());
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Income | Bill | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showEditExpenseDialog, setShowEditExpenseDialog] = useState(false);

  const currentDate = today.format('dddd, D');

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
      category_name: "Uncategorized",
      user_id: 1,
      created_at: dayjs().toISOString(),
      isOneTime: false,
      date: dayjs().toISOString()
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

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: dayjs().month(i).format('MMMM')
  }));

  const years = Array.from({ length: 11 }, (_, i) => ({
    value: today.year() - 5 + i,
    label: (today.year() - 5 + i).toString()
  }));

  const getWeeksInMonth = (year: number, month: number) => {
    const firstDay = dayjs().year(year).month(month).startOf('month');
    const lastDay = firstDay.endOf('month');
    const numWeeks = Math.ceil((firstDay.day() + lastDay.date()) / 7);
    return Array.from({ length: numWeeks }, (_, i) => ({
      value: i + 1,
      label: `Week ${i + 1}`
    }));
  };

  const weeks = getWeeksInMonth(selectedYear, selectedMonth);

  const firstDayOfMonth = dayjs().year(selectedYear).month(selectedMonth).startOf("month");
  const lastDayOfMonth = dayjs().year(selectedYear).month(selectedMonth).endOf("month");
  const firstDayIndex = firstDayOfMonth.day();
  const totalDaysInMonth = lastDayOfMonth.date();
  const calendarDays = Array.from({ length: 35 }, (_, index) => {
    const day = index - firstDayIndex + 1;
    return day >= 1 && day <= totalDaysInMonth ? day : null;
  });

  const isCurrentDay = (day: number) => {
    return day === today.date() &&
           selectedMonth === today.month() &&
           selectedYear === today.year();
  };

  const getMonthlyIncomeOccurrences = () => {
    const currentDate = dayjs().year(selectedYear).month(selectedMonth);
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');

    const occurrences: Income[] = [];
    const addedDates = new Set<string>(); 

    incomes.forEach(income => {
      const addIncomeIfNotExists = (date: dayjs.Dayjs, amount: number) => {
        const dateStr = date.format('YYYY-MM-DD');
        if (!addedDates.has(`${income.source}-${dateStr}`)) {
          addedDates.add(`${income.source}-${dateStr}`);
          occurrences.push({
            id: `${income.id}-${dateStr}`,
            source: income.source,
            amount: amount,
            date: date.toISOString()
          });
        }
      };

      if (income.source === "Majdi's Salary") {
        addIncomeIfNotExists(startOfMonth, 4739);
        addIncomeIfNotExists(startOfMonth.date(15), 4739);
      } else if (income.source === "Ruba's Salary") {
        let checkDate = dayjs('2025-01-10');
        while (checkDate.isBefore(endOfMonth) || checkDate.isSame(endOfMonth)) {
          if ((checkDate.isAfter(startOfMonth) || checkDate.isSame(startOfMonth)) && 
              checkDate.day() === 5) { 
            const weeksDiff = checkDate.diff(dayjs('2025-01-10'), 'week');
            if (weeksDiff >= 0 && weeksDiff % 2 === 0) {
              addIncomeIfNotExists(checkDate, income.amount);
            }
          }
          checkDate = checkDate.add(1, 'day');
        }
      } else {
        const incomeDate = dayjs(income.date);
        if (incomeDate.month() === selectedMonth && incomeDate.year() === selectedYear) {
          addIncomeIfNotExists(incomeDate, income.amount);
        }
      }
    });

    return occurrences;
  };

  const getIncomeForDay = (day: number) => {
    const monthlyIncomes = getMonthlyIncomeOccurrences();
    const targetDate = dayjs().year(selectedYear).month(selectedMonth).date(day);

    return monthlyIncomes.filter(income => {
      const incomeDate = dayjs(income.date);
      return incomeDate.date() === day && 
             incomeDate.month() === selectedMonth && 
             incomeDate.year() === selectedYear;
    });
  }

  const getBillsForDay = (day: number) => {
    const targetDate = dayjs().year(selectedYear).month(selectedMonth).date(day);
    return bills.filter(bill => {
      if (bill.isOneTime) {
        const billDate = dayjs(bill.date);
        return billDate && billDate.date() === day && billDate.month() === selectedMonth && billDate.year() === selectedYear;
      } else {
        return bill.day === day;
      }
    });
  }

  const calculateTotalsUpToDay = (day: number) => {
    let totalIncome = 0;
    let totalBills = 0;

    const targetDate = dayjs().year(selectedYear).month(selectedMonth).date(day);

    const monthlyIncomes = getMonthlyIncomeOccurrences();
    monthlyIncomes.forEach(income => {
      const incomeDate = dayjs(income.date);
      if (incomeDate.date() <= day && incomeDate.month() === selectedMonth && incomeDate.year() === selectedYear) {
        totalIncome += income.amount;
      }
    });

    bills.forEach(bill => {
      if (bill.isOneTime) {
        const billDate = dayjs(bill.date);
        if (billDate.isSame(targetDate, 'month')) {
          if (billDate.date() <= day && billDate.month() === selectedMonth && billDate.year() === selectedYear) {
            totalBills += bill.amount;
          }
        }
      } else {
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
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">My Budget</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleAddIncome}>
              <Plus className="h-4 w-4 mr-2" /> Add Income
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const latestIncome = incomes[incomes.length - 1];
                if (latestIncome) {
                  handleEditTransaction('income', latestIncome);
                }
              }}
            >
              <Edit className="h-4 w-4 mr-2" /> Edit Income
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const latestIncome = incomes[incomes.length - 1];
                if (latestIncome) {
                  handleDeleteTransaction('income', latestIncome);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete Income
            </Button>

            <Button variant="outline" size="sm" onClick={handleAddBill}>
              <Plus className="h-4 w-4 mr-2" /> Add Bill
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const latestBill = bills[bills.length - 1];
                if (latestBill) {
                  handleEditTransaction('bill', latestBill);
                }
              }}
            >
              <Edit className="h-4 w-4 mr-2" /> Edit Bill
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const latestBill = bills[bills.length - 1];
                if (latestBill) {
                  handleDeleteTransaction('bill', latestBill);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete Bill
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
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
            <p className="text-lg font-semibold text-blue-600">
              {formatCurrency(
                calculateTotalsUpToDay(totalDaysInMonth).totalIncome -
                calculateTotalsUpToDay(totalDaysInMonth).totalBills
              )}
            </p>
          </div>
        </div>
      </div>

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
              {Array.from({ length: 5 }, (_, weekIndex) => (
                <tr key={weekIndex} className="divide-x">
                  {Array.from({ length: 7 }, (_, dayIndex) => {
                    const dayNumber = calendarDays[weekIndex * 7 + dayIndex];
                    if (dayNumber === null) {
                      return <td key={dayIndex} className="border p-1 lg:p-2 bg-muted/10 h-24 lg:h-48" />;
                    }

                    const currentDate = dayjs().year(selectedYear).month(selectedMonth).date(dayNumber);
                    const dayOfWeek = currentDate.format('ddd');
                    const dayIncomes = getIncomeForDay(dayNumber);
                    const dayBills = getBillsForDay(dayNumber);
                    const hasTransactions = dayIncomes.length > 0 || dayBills.length > 0;
                    const isToday = isCurrentDay(dayNumber);

                    return (
                      <td
                        key={dayIndex}
                        onClick={() => handleDayClick(dayNumber)}
                        aria-label={`${dayNumber} ${dayjs().format("MMMM")} ${today.year()}${isToday ? ' (Today)' : ''}`}
                        className={cn(
                          "border p-1 lg:p-2 align-top cursor-pointer transition-colors h-24 lg:h-48 relative touch-manipulation",
                          "hover:bg-accent",
                          isToday && "ring-2 ring-primary ring-offset-2 border-primary border-2",
                          selectedDay === dayNumber && "bg-accent/50 font-semibold",
                          hasTransactions && "shadow-sm"
                        )}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-1">
                            <span className={cn(
                              "font-medium text-base lg:text-lg",
                              isToday && "text-primary font-bold"
                            )}>
                              {dayNumber}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {dayOfWeek}
                            </span>
                            {isToday && (
                              <span className="text-xs font-medium text-primary ml-1 animate-flash px-1 rounded">
                                Today
                              </span>
                            )}
                          </div>
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
                              className="flex justify-between items-center text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded px-1 group"
                            >
                              <span className="truncate max-w-[60%]">
                                {index + 1}. {income.source}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="font-medium shrink-0">
                                  {formatCurrency(income.amount)}
                                </span>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditTransaction('income', income);
                                    }}
                                    className="p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTransaction('income', income);
                                    }}
                                    className="p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {dayBills.map((bill, index) => (
                            <div
                              key={bill.id}
                              className="flex justify-between items-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded px-1 group"
                            >
                              <span className="truncate max-w-[60%]">
                                {index + 1}. {bill.name}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="font-medium shrink-0">
                                  {formatCurrency(bill.amount)}
                                </span>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditTransaction('bill', bill);
                                    }}
                                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTransaction('bill', bill);
                                    }}
                                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
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