import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Income as IncomeType, Bill as BillType } from "./types";

// Removed duplicate IncomeType interface
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
  console.log('App component rendering - main view');
  // Fixed reference date for the app
  const today = dayjs('2025-02-09');
  const [selectedYear, setSelectedYear] = useState(today.year());
  const [selectedMonth, setSelectedMonth] = useState(today.month());
  const [selectedDay, setSelectedDay] = useState<number>(today.date());
  const [showDayDialog, setShowDayDialog] = useState(false);
  const [incomes, setIncomes] = useState<IncomeType[]>([]);
  const [bills, setBills] = useState<BillType[]>([]);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddBillDialog, setShowAddBillDialog] = useState(false);
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeType | null>(null);
  const [showEditIncomeDialog, setShowEditIncomeDialog] = useState(false);
  const [showAddIncomeDialog, setShowAddIncomeDialog] = useState(false);
  const [deletingIncome, setDeletingIncome] = useState<IncomeType | null>(null);
  const [showDeleteIncomeDialog, setShowDeleteIncomeDialog] = useState(false);
  const [addIncomeDate, setAddIncomeDate] = useState<Date>(new Date());
  const [showDailySummary, setShowDailySummary] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const closeSummary = () => {
    setShowDayDialog(false);
  };

  useEffect(() => {
    localStorage.removeItem("incomes");
    localStorage.removeItem("bills");

    const storedIncomes = localStorage.getItem("incomes");
    const storedBills = localStorage.getItem("bills");

    console.log('Stored incomes from localStorage:', storedIncomes);
    console.log('Stored bills from localStorage:', storedBills);

    if (!storedIncomes) {
      const today = dayjs();
      const sampleIncomes: IncomeType[] = [
        { id: "1", source: "Majdi's Salary", amount: 4739.00, date: today.date(1).toISOString(), firstDate: today.date(1).toDate().getTime(), secondDate: today.date(15).toDate().getTime(), occurrenceType: 'biweekly' },
        { id: "2", source: "Majdi's Salary", amount: 4739.00, date: today.date(15).toISOString(), firstDate: today.date(1).toDate().getTime(), secondDate: today.date(15).toDate().getTime(), occurrenceType: 'biweekly' },
        { id: "3", source: "Ruba's Salary", amount: 2168.00, date: "2025-01-10", firstDate: new Date("2025-01-10").getTime(), secondDate: new Date("2025-01-24").getTime(), occurrenceType: 'biweekly' }
      ];
      setIncomes(sampleIncomes);
      localStorage.setItem("incomes", JSON.stringify(sampleIncomes));
    } else {
      setIncomes(JSON.parse(storedIncomes));
    }

    if (!storedBills) {
      const sampleBills: BillType[] = [
        {
          id: "1", name: "ATT Phone Bill ($115 Rund Roaming)", amount: 429.00, day: 1,
          isYearly: undefined,
          date: "",
          category_id: () => "",
          description: undefined,
          reminderEnabled: false,
          reminderDays: 0
        },
        {
          id: "2", name: "Maid's 1st payment", amount: 120.00, day: 1,
          isYearly: undefined,
          date: "",
          category_id: (category_id: any) => "",
          description: undefined,
          reminderDays: 0,
          reminderEnabled: undefined
        },
        {
          id: "3", name: "Monthly Rent", amount: 3750.00, day: 1,
          isYearly: undefined,
          date: "",
          category_id: (category_id: any) => "",
          description: undefined,
          reminderDays: 0,
          reminderEnabled: undefined
        },
        {
          id: "4", name: "Sling TV (CC 9550)", amount: 75.00, day: 3,
          isYearly: undefined,
          date: "",
          category_id: (category_id: any) => "",
          description: undefined,
          reminderDays: 0,
          reminderEnabled: undefined
        },
        {
          id: "5", name: "Cox Internet", amount: 81.00, day: 6,
          isYearly: undefined,
          date: "",
          category_id: function (category_id: any): string {
            throw new Error("Function not implemented.");
          },
          description: undefined,
          reminderDays: 0,
          reminderEnabled: undefined
        },
        {
          id: "6", name: "Water Bill", amount: 80.00, day: 7,
          isYearly: undefined,
          date: "",
          category_id: function (category_id: any): string {
            throw new Error("Function not implemented.");
          },
          description: undefined,
          reminderDays: 0,
          reminderEnabled: undefined
        },
        {
          id: "7", name: "NV Energy Electrical ($100 winter months)", amount: 250.00, day: 7,
          isYearly: undefined,
          date: "",
          category_id: function (category_id: any): string {
            throw new Error("Function not implemented.");
          },
          description: undefined,
          reminderDays: 0,
          reminderEnabled: undefined
        },
        {
          id: "8", name: "TransAmerica Life Insurance", amount: 77.00, day: 9,
          isYearly: undefined,
          date: "",
          category_id: function (category_id: any): string {
            throw new Error("Function not implemented.");
          },
          description: undefined,
          reminderDays: 0,
          reminderEnabled: undefined
        },
        {
          id: "9", name: "Credit Card minimum payments", amount: 225.00, day: 14,
          isYearly: undefined,
          date: "",
          category_id: function (category_id: any): string {
            throw new Error("Function not implemented.");
          },
          description: undefined,
          reminderDays: 0,
          reminderEnabled: undefined
        },
        {
          id: "10", name: "Apple/Google/YouTube (CC 9550)", amount: 130.00, day: 14,
          isYearly: undefined,
          date: "",
          category_id: function (category_id: any): string {
            throw new Error("Function not implemented.");
          },
          description: undefined,
          reminderDays: 0,
          reminderEnabled: undefined
        },
        {
          id: "11", name: "Expenses & Groceries charged on (CC 2647)", amount: 3000.00, day: 16,
          isYearly: undefined,
          date: "",
          category_id: function (category_id: any): string {
            throw new Error("Function not implemented.");
          },
          description: undefined,
          reminderDays: 0,
          reminderEnabled: undefined
        },
        {
          id: "12", name: "Maid's 2nd Payment of the month", amount: 120.00, day: 17,
          isYearly: undefined,
          date: "",
          category_id: function (category_id: any): string {
            throw new Error("Function not implemented.");
          },
          description: undefined,
          reminderDays: 0,
          reminderEnabled: undefined
        },
        {
          id: "13", name: "SoFi Personal Loan", amount: 1915.00, day: 17,
          isYearly: undefined,
          date: "",
          category_id: function (category_id: any): string {
            throw new Error("Function not implemented.");
          },
          description: undefined,
          reminderDays: 0,
          reminderEnabled: undefined
        },
        {
          id: "14", name: "Southwest Gas ($200 in winter/$45 in summer)", amount: 75.00, day: 17,
          isYearly: undefined,
          date: "",
          category_id: function (category_id: any): string {
            throw new Error("Function not implemented.");
          },
          description: undefined,
          reminderDays: 0,
          reminderEnabled: undefined
        },
        {
          id: "15", name: "Car Insurance for 3 cars ($268 + $169 + $303 + $21)", amount: 704.00, day: 28,
          isYearly: undefined,
          date: "",
          category_id: function (): string {
            throw new Error("Function not implemented.");
          },
          description: undefined,
          reminderDays: 0,
          reminderEnabled: undefined
        }
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

  const handleEditTransaction = (type: 'income' | 'bill', data: IncomeType | BillType) => {
    if (type === 'income') {
      setEditingIncome(data as IncomeType);
      setShowEditIncomeDialog(true);
    } else if (type === 'bill') {
      setEditingBill(data as Bill);
      setShowEditDialog(true);
    }
  };

  const handleDeleteTransaction = (type: 'income' | 'bill', data: IncomeType | BillType) => {
    if (type === 'income') {
      setDeletingIncome(data as IncomeType);
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
      const newIncomes = incomes.filter(i => i.id !== deletingIncome.id);
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

  // Update the calendar selection handler
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      // Use the selected date directly from the calendar
      const selectedDate = dayjs(date);
      setSelectedDay(selectedDate.date());
      setSelectedMonth(selectedDate.month());
      setSelectedYear(selectedDate.year());
      setShowDailySummary(true);
    }
  };

  useEffect(() => {
    // Initialize the app on mount
    console.log('App component mounted at', window.location.pathname);
    // If we are on the root route, redirect to main page
    if (location.pathname === '/' || location.pathname === '') {
      console.log('Redirecting to main page from:', location.pathname);
      navigate('/main', { replace: true });
    }
  }, [location.pathname, navigate]);

  let firstDate: number;
        
  // Ensure firstDate is assigned a number
  firstDate = new Date().getTime(); // Example: Assigning the current timestamp as a number
  
  // Example usage
  console.log(firstDate); // Output the number

  // Assuming secondDate is a string that needs to be converted to a number
  const secondDate: number = new Date("2023-10-01").getTime(); // Convert to timestamp number

  // Example usage
  console.log(secondDate); // Output the number

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
                <Select value={selectedMonth.toString()} onValueChange={(value) => handleMonthChange(parseInt(value))}>
                  <SelectTrigger>
                    <span className="p-2 border rounded bg-background min-w-[120px]">{months[selectedMonth].label}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedYear.toString()} onValueChange={(value) => handleYearChange(parseInt(value))}>
                  <SelectTrigger>
                    <span className="p-2 border rounded bg-background min-w-[100px]">{selectedYear}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                onSelect={handleCalendarSelect}
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
        monthlyTotals={monthlyTotals}
      />
    </div>
  );
};

export default App;

export interface Income {
  id: string;
  source: string;
  amount: number;
  date: string;
  firstDate: string;
  secondDate: string;
  occurrenceType: 'once' | 'monthly' | 'biweekly' | 'weekly';
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  day: number;
  isYearly?: boolean;
  date: string;
  category_id: (category_id: any) => string;
  description?: string;
  firstDate?: string;
}