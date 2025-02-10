import { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Income, Bill } from "./types";
import { cn } from "@/lib/utils";
import { LeftSidebar } from "@/components/LeftSidebar";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DailySummaryDialog } from "@/components/DailySummaryDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
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

dayjs.extend(isBetween);

type OccurrenceType = 'once' | 'monthly' | 'biweekly' | 'weekly';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const App = () => {
  // Update the today constant at the top of the file
  const today = dayjs('2025-02-09'); // Set to February 9, 2025
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

  const closeSummary = () => {
    setShowDayDialog(false);
  };

  useEffect(() => {
    // Clear existing data first
    localStorage.removeItem("incomes");
    localStorage.removeItem("bills");

    const storedIncomes = localStorage.getItem("incomes");
    const storedBills = localStorage.getItem("bills");

    if (!storedIncomes) {
      const today = dayjs();
      const sampleIncomes: Income[] = [
        { id: "1", source: "Majdi's Salary", amount: 4739.00, date: today.date(1).toISOString() },
        { id: "2", source: "Majdi's Salary", amount: 4739.00, date: today.date(15).toISOString() },
        { id: "3", source: "Ruba's Salary", amount: 2168.00, date: "2025-01-10" } // Only need one entry for Ruba's salary
      ];
      setIncomes(sampleIncomes);
      localStorage.setItem("incomes", JSON.stringify(sampleIncomes));
    } else {
      setIncomes(JSON.parse(storedIncomes));
    }

    if (!storedBills) {
      const sampleBills: Bill[] = [
        { id: "1", name: "ATT Phone Bill ($115 Rund Roaming)", amount: 429.00, day: 1 },
        { id: "2", name: "Maid's 1st payment", amount: 120.00, day: 1 },
        { id: "3", name: "Monthly Rent", amount: 3750.00, day: 1 },
        { id: "4", name: "Sling TV (CC 9550)", amount: 75.00, day: 3 },
        { id: "5", name: "Cox Internet", amount: 81.00, day: 6 },
        { id: "6", name: "Water Bill", amount: 80.00, day: 7 },
        { id: "7", name: "NV Energy Electrical ($100 winter months)", amount: 250.00, day: 7 },
        { id: "8", name: "TransAmerica Life Insurance", amount: 77.00, day: 9 },
        { id: "9", name: "Credit Card minimum payments", amount: 225.00, day: 14 },
        { id: "10", name: "Apple/Google/YouTube (CC 9550)", amount: 130.00, day: 14 },
        { id: "11", name: "Expenses & Groceries charged on (CC 2647)", amount: 3000.00, day: 16 },
        { id: "12", name: "Maid's 2nd Payment of the month", amount: 120.00, day: 17 },
        { id: "13", name: "SoFi Personal Loan", amount: 1915.00, day: 17 },
        { id: "14", name: "Southwest Gas ($200 in winter/$45 in summer)", amount: 75.00, day: 17 },
        { id: "15", name: "Car Insurance for 3 cars ($268 + $169 + $303 + $21)", amount: 704.00, day: 28 }
      ];
      setBills(sampleBills);
      localStorage.setItem("bills", JSON.stringify(sampleBills));
    } else {
      setBills(JSON.parse(storedBills));
    }
  }, []);

  const getIncomeForDay = (day: number) => {
    if (day <= 0 || day > daysInMonth) return [];

    const currentDate = dayjs()
      .year(selectedYear)
      .month(selectedMonth)
      .date(day);

    return incomes.filter(income => {
      const incomeDate = dayjs(income.date);

      if (income.source === "Ruba's Salary") {
        // Check if it's a Friday (5 in dayjs)
        if (currentDate.day() !== 5) return false;

        // Start from January 10, 2025
        const startDate = dayjs('2025-01-10');

        // Calculate weeks difference
        const weeksDiff = currentDate.diff(startDate, 'week');

        // Return true if it's a bi-weekly Friday from the start date
        return weeksDiff >= 0 && weeksDiff % 2 === 0;
      }

      // For other incomes, check the day of month
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

  const isCurrentDay = (day: number) => {
    const currentDate = dayjs();
    return day === currentDate.date() &&
           selectedMonth === currentDate.month() &&
           selectedYear === currentDate.year();
  };

  const calendarDays = useMemo(() => {
    const totalDays = 42; // 6 weeks × 7 days
    return Array.from({ length: totalDays }, (_, index) => {
      const adjustedIndex = index - firstDayOfWeek;
      return adjustedIndex >= 0 && adjustedIndex < daysInMonth ? adjustedIndex + 1 : null;
    });
  }, [daysInMonth, firstDayOfWeek]);

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
        // For regular monthly incomes
        const incomeYear = incomeDate.year();
        const incomeMonth = incomeDate.month();
        const incomeDay = incomeDate.date();

        // Create a new date with the selected year/month but same day
        const adjustedDate = dayjs()
          .year(selectedYear)
          .month(selectedMonth)
          .date(incomeDay);

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

  const confirmIncomeDelete = () => {
    if (deletingIncome) {
      const newIncomes = incomes.filter(i => i.source !== deletingIncome.source);
      setIncomes(newIncomes);
      localStorage.setItem("incomes", JSON.stringify(newIncomes));
      setShowDeleteIncomeDialog(false);
      setDeletingIncome(null);
    }
  };

  const handleAddIncome = () => {
    setAddIncomeDate(new Date());
    setShowAddIncomeDialog(true);
  };

  const handleAddBill = () => {
    setShowAddBillDialog(true);
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

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-56 border-r p-2 bg-muted/30 fixed top-0 bottom-0 overflow-y-auto">
        <LeftSidebar
          incomes={incomes}
          bills={bills}
          onEditTransaction={handleEditTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onAddIncome={handleAddIncome}
          onAddBill={handleAddBill}
          onReset={handleReset}
        />
      </aside>

      <main className="ml-56 flex-1 flex flex-col h-screen overflow-hidden min-w-[900px]">
        <Card className="p-4 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">
                My Budget - {dayjs().month(selectedMonth).format("MMMM")} {selectedYear}
              </h1>
              <div className="flex items-center gap-2">
                <select 
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                  className="p-2 border rounded bg-background min-w-[120px]"
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
                  className="p-2 border rounded bg-background min-w-[100px]"
                  aria-label="Select year"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                  className="p-2 border rounded bg-background min-w-[80px]"
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

            <div className="flex items-center gap-6">
              <ThemeToggle />
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(monthlyTotals.totalIncome)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Bills</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(monthlyTotals.totalBills)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Balance</p>
                <p className={`text-lg font-semibold ${
                  monthlyTotals.balance >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {formatCurrency(monthlyTotals.balance)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex-1 overflow-y-auto">
          <Card className="m-4">
            <div className="overflow-hidden">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-background z-10">
                  <tr>
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                      <th key={day} className="p-2 text-center font-medium text-muted-foreground border w-[14.28%]">
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
                          return <td key={dayIndex} className="border p-2 bg-muted/10 h-48 w-[14.28%]" />;
                        }

                        const dayIncomes = getIncomeForDay(dayNumber);
                        const dayBills = getBillsForDay(dayNumber);
                        const hasTransactions = dayIncomes.length > 0 || dayBills.length > 0;

                        return (
                          <td
                            key={dayIndex}
                            onClick={() => handleDayClick(dayNumber)}
                            className={cn(
                              "border p-2 align-top cursor-pointer transition-colors h-48 w-[14.28%]",
                              "hover:bg-accent",
                              isCurrentDay(dayNumber) && "ring-2 ring-primary ring-offset-2 border-primary",
                              selectedDay === dayNumber && "bg-accent/50 font-semibold",
                              hasTransactions && "shadow-sm"
                            )}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex flex-col">
                                <span className={cn(
                                  "font-medium text-lg",
                                  isCurrentDay(dayNumber) && "text-primary font-bold"
                                )}>
                                  {dayNumber}
                                </span>
                                {isCurrentDay(dayNumber) && (
                                  <span className="text-xs font-medium text-primary">
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
                              {dayIncomes.length > 0 && (
                                <div className="space-y-0.5">
                                  <p className="font-medium text-green-600 dark:text-green-400">Income</p>
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
                                </div>
                              )}
                              {dayBills.length > 0 && (
                                <div className="space-y-0.5">
                                  <p className="font-medium text-red-600 dark:text-red-400">Expenses</p>
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
    </div>
  );
};

export default App;