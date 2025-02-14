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
  const today = dayjs('2025-02-09'); 
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
    localStorage.removeItem("incomes");
    localStorage.removeItem("bills");

    const storedIncomes = localStorage.getItem("incomes");
    const storedBills = localStorage.getItem("bills");

    if (!storedIncomes) {
      const today = dayjs();
      const sampleIncomes: Income[] = [
        { id: "1", source: "Majdi's Salary", amount: 4739.00, date: today.date(1).toISOString() },
        { id: "2", source: "Majdi's Salary", amount: 4739.00, date: today.date(15).toISOString() },
        { id: "3", source: "Ruba's Salary", amount: 2168.00, date: "2025-01-10" } 
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
        if (currentDate.day() !== 5) return false;

        const startDate = dayjs('2025-01-10');

        const weeksDiff = currentDate.diff(startDate, 'week');

        return weeksDiff >= 0 && weeksDiff % 2 === 0;
      }

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
    const day = firstDayOfMonth.day();
    return day === 0 ? 6 : day - 1; 
  }, [firstDayOfMonth]);

  const calculateTotalsUpToDay = (day: number) => {
    let totalIncome = 0;
    let totalBills = 0;

    for (let currentDay = 1; currentDay <= day; currentDay++) {
      const dayIncomes = getIncomeForDay(currentDay);
      totalIncome += dayIncomes.reduce((sum, income) => sum + income.amount, 0);

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
    const totalDays = 42; 
    return Array.from({ length: totalDays }, (_, index) => {
      const adjustedIndex = index - firstDayOfWeek;
      return adjustedIndex >= 0 && adjustedIndex < daysInMonth ? adjustedIndex + 1 : null;
    });
  }, [daysInMonth, firstDayOfWeek]);

  const monthlyTotals = useMemo(() => {
    let totalIncome = 0;
    let totalBills = 0;

    incomes.forEach(income => {
      const incomeDate = dayjs(income.date);

      if (income.source === "Ruba's Salary") {
        const firstDayOfMonth = dayjs().year(selectedYear).month(selectedMonth).startOf('month');
        const lastDayOfMonth = firstDayOfMonth.endOf('month');
        const startDate = dayjs('2025-01-10');

        let currentDate = firstDayOfMonth;
        while (currentDate.isBefore(lastDayOfMonth) || currentDate.isSame(lastDayOfMonth, 'day')) {
          if (currentDate.day() === 5) { 
            const weeksDiff = currentDate.diff(startDate, 'week');
            if (weeksDiff >= 0 && weeksDiff % 2 === 0) {
              totalIncome += income.amount;
            }
          }
          currentDate = currentDate.add(1, 'day');
        }
      } else {
        const incomeYear = incomeDate.year();
        const incomeMonth = incomeDate.month();
        const incomeDay = incomeDate.date();

        const adjustedDate = dayjs()
          .year(selectedYear)
          .month(selectedMonth)
          .date(incomeDay);

        if (adjustedDate.month() === selectedMonth) {
          totalIncome += income.amount;
        }
      }
    });

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
    setSelectedDay(1); 
  };

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    setSelectedDay(1); 
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
                <Select value={months[selectedMonth]} onValueChange={handleMonthChange}>
                  <SelectTrigger>
                  <span className="p-2 border rounded bg-background min-w-[120px]">{months[selectedMonth].label}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={years.find(year => year===selectedYear)} onValueChange={handleYearChange}>
                  <SelectTrigger>
                  <span className="p-2 border rounded bg-background min-w-[100px]">{selectedYear}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/*Removed day select*/}
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
              <Calendar
                mode="single"
                selected={new Date(selectedYear, selectedMonth, selectedDay)}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDay(date.getDate());
                    setSelectedMonth(date.getMonth());
                    setSelectedYear(date.getFullYear());
                    setShowDailySummary(true);
                  }
                }}
                bills={bills}
                incomes={incomes}
                className="rounded-md"
              />
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