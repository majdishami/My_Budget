import { Route, useRoute } from "wouter";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Income, Bill } from "@/types";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { useData } from "@/contexts/DataContext";
import DailySummaryDialog from "@/components/DailySummaryDialog";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ThemeToggle from "@/components/ThemeToggle";

// Initialize dayjs plugins
dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);

// Set default timezone to local
dayjs.tz.setDefault(dayjs.tz.guess());

const generateId = () => crypto.randomUUID();

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Memoized transaction card component
const TransactionCard = memo(({ item, type }: { item: Income | Bill; type: 'income' | 'bill' }) => {
  return (
    <div 
      className={`flex justify-between items-center text-[8px] md:text-xs ${
        type === 'income' 
          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30' 
          : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30'
      } rounded px-0.5`}
    >
      <span className="truncate max-w-[60%]">
        {type === 'income' ? (item as Income).source : (item as Bill).name}
      </span>
      <span className="font-medium shrink-0">
        {formatCurrency(item.amount)}
      </span>
    </div>
  );
});

TransactionCard.displayName = 'TransactionCard';

// Memoized day cell component
const DayCell = memo(({ 
  day, 
  isCurrentDay,
  selectedDay,
  dayIncomes,
  dayBills,
  onDayClick 
}: { 
  day: number;
  isCurrentDay: boolean;
  selectedDay: number;
  dayIncomes: Income[];
  dayBills: Bill[];
  onDayClick: (day: number) => void;
}) => {
  const hasTransactions = dayIncomes.length > 0 || dayBills.length > 0;
  const dayOfWeek = dayjs().date(day).format('ddd');

  return (
    <td
      onClick={() => onDayClick(day)}
      className={cn(
        "border p-0.5 lg:p-2 align-top cursor-pointer transition-colors h-12 md:h-24 lg:h-48 relative touch-manipulation",
        "hover:bg-accent active:bg-accent/70",
        isCurrentDay && "ring-2 ring-primary ring-offset-2",
        selectedDay === day && "bg-accent/50",
        hasTransactions && "shadow-sm"
      )}
    >
      <div className="flex justify-between items-start mb-0.5">
        <div className="flex items-center gap-0.5">
          <span className={cn(
            "font-medium text-xs md:text-base lg:text-lg",
            isCurrentDay && "text-primary font-bold"
          )}>
            {day}
          </span>
          <span className="hidden md:inline text-[10px] text-muted-foreground">
            {dayOfWeek}
          </span>
          {isCurrentDay && (
            <span className="text-[8px] md:text-xs font-medium text-primary ml-0.5 animate-pulse px-0.5 rounded">
              Today
            </span>
          )}
        </div>
        {hasTransactions && (
          <div className="flex gap-0.5">
            {dayIncomes.length > 0 && (
              <div className="w-1 h-1 md:w-2 md:h-2 rounded-full bg-green-500" />
            )}
            {dayBills.length > 0 && (
              <div className="w-1 h-1 md:w-2 md:h-2 rounded-full bg-red-500" />
            )}
          </div>
        )}
      </div>
      <div className="space-y-0.5 text-[8px] md:text-xs max-h-[calc(100%-1.5rem)] overflow-y-auto">
        {dayIncomes.map((income) => (
          <TransactionCard key={income.id} item={income} type="income" />
        ))}
        {dayBills.map((bill) => (
          <TransactionCard key={bill.id} item={bill} type="bill" />
        ))}
      </div>
    </td>
  );
});

DayCell.displayName = 'DayCell';

export function Budget() {
  const { incomes, bills, isLoading, error } = useData();
  const today = useMemo(() => dayjs('2025-02-13'), []); 
  const [selectedDay, setSelectedDay] = useState(today.date());
  const [selectedMonth, setSelectedMonth] = useState(today.month()); // 0-based month
  const [selectedYear, setSelectedYear] = useState(today.year());
  const [showDailySummary, setShowDailySummary] = useState(false);

  // Optimize months and years calculations
  const months = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: dayjs().month(i).format('MMMM')
    })), 
  []); 

  const years = useMemo(() => 
    Array.from({ length: 11 }, (_, i) => ({
      value: today.year() - 5 + i,
      label: (today.year() - 5 + i).toString()
    })), 
  [today]); 

  // Update getIncomeForDay to properly handle recurring incomes
  const getIncomeForDay = useCallback((day: number) => {
    if (day <= 0) return [];

    return incomes.filter(income => {
      const incomeDate = dayjs(income.date);

      // For Ruba's bi-weekly salary
      if (income.source === "Ruba's Salary") {
        const currentDate = dayjs()
          .year(selectedYear)
          .month(selectedMonth)
          .date(day);

        if (currentDate.day() !== 5) return false; // Only Fridays

        const startDate = dayjs('2025-01-10');
        const weeksDiff = currentDate.diff(startDate, 'week');
        return weeksDiff >= 0 && weeksDiff % 2 === 0;
      }

      // For Majdi's salary (1st and 15th of every month)
      if (income.source === "Majdi's Salary") {
        return day === 1 || day === 15;
      }

      // For other incomes, check exact date match
      return incomeDate.date() === day && 
             incomeDate.month() === selectedMonth && 
             incomeDate.year() === selectedYear;
    });
  }, [incomes, selectedYear, selectedMonth]);

  // Update getBillsForDay to handle monthly bills
  const getBillsForDay = useCallback((day: number) => {
    return bills.filter(bill => {
      const billDate = dayjs(bill.date);
      return billDate.date() === day && 
             billDate.month() === selectedMonth && 
             billDate.year() === selectedYear;
    });
  }, [bills, selectedYear, selectedMonth]);

  // Memoize monthly totals calculation
  const monthlyTotals = useMemo(() => {
    console.log('Calculating monthly totals:', {
      selectedMonth,
      selectedYear,
      incomes,
      bills
    });

    // Calculate total income
    const totalIncome = incomes.reduce((sum, income) => {
      const incomeDate = dayjs(income.date);
      if (incomeDate.month() === selectedMonth && 
          incomeDate.year() === selectedYear) {
        console.log('Adding income:', income);
        return sum + income.amount;
      }
      return sum;
    }, 0);

    // Calculate total expenses
    const totalExpenses = bills.reduce((sum, bill) => {
      const billDate = dayjs(bill.date);
      if (billDate.month() === selectedMonth && 
          billDate.year() === selectedYear) {
        console.log('Adding bill:', bill);
        return sum + bill.amount;
      }
      return sum;
    }, 0);

    console.log('Monthly totals calculated:', {
      totalIncome,
      totalExpenses,
      net: totalIncome - totalExpenses
    });

    return {
      income: totalIncome,
      expenses: totalExpenses,
      net: totalIncome - totalExpenses
    };
  }, [incomes, bills, selectedMonth, selectedYear]);

  // Add memoized running totals calculation
  const calculateRunningTotals = useCallback((day: number) => {
    let totalIncome = 0;
    let totalBills = 0;

    const targetDate = dayjs().year(selectedYear).month(selectedMonth).date(day);

    incomes.forEach(income => {
      const incomeDate = dayjs(income.date);
      if (incomeDate.isSameOrBefore(targetDate)) {
        totalIncome += income.amount;
      }
    });

    bills.forEach(bill => {
      if (bill.isOneTime) {
        const billDate = dayjs(bill.date);
        if (billDate && billDate.isSameOrBefore(targetDate)) {
          totalBills += bill.amount;
        }
      } else if (bill.day <= day) {
        totalBills += bill.amount;
      }
    });

    return { totalIncome, totalBills };
  }, [incomes, bills, selectedYear, selectedMonth]);

  // Handle month and year changes with validation
  const handleMonthChange = useCallback((month: number) => {
    setSelectedMonth(month);
    const days = dayjs().year(selectedYear).month(month).daysInMonth();
    setSelectedDay(Math.min(selectedDay, days));
  }, [selectedYear, selectedDay]);

  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
    const days = dayjs().year(year).month(selectedMonth).daysInMonth();
    setSelectedDay(Math.min(selectedDay, days));
  }, [selectedMonth, selectedDay]);

  // Memoize day click handler
  const handleDayClick = useCallback((day: number) => {
    setSelectedDay(day);
    setShowDailySummary(true);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading budget data...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertDescription>
          Failed to load budget data: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between p-2 md:p-4 border-b sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 space-y-2 md:space-y-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-1 md:gap-2">
            <select 
              value={selectedMonth}
              onChange={(e) => handleMonthChange(parseInt(e.target.value))}
              className="p-1.5 md:p-2 border rounded bg-background min-w-[100px] md:min-w-[120px] text-xs md:text-base"
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
              className="p-1.5 md:p-2 border rounded bg-background min-w-[80px] md:min-w-[100px] text-xs md:text-base"
              aria-label="Select year"
            >
              {years.map(year => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </select>

            {selectedMonth === today.month() && selectedYear === today.year() && (
              <span className="text-[10px] md:text-sm text-muted-foreground ml-1 md:ml-2">
                {today.format('ddd')}, {today.format('D')}
              </span>
            )}
          </div>
          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>

        <div className="grid grid-cols-3 md:flex md:items-center gap-1 md:gap-4">
          <div>
            <p className="text-[10px] md:text-sm text-muted-foreground">Month Income</p>
            <p className="text-xs md:text-lg font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(monthlyTotals.income)}
            </p>
          </div>
          <div>
            <p className="text-[10px] md:text-sm text-muted-foreground">Month Bills</p>
            <p className="text-xs md:text-lg font-semibold text-red-600 dark:text-red-400">
              {formatCurrency(monthlyTotals.expenses)}
            </p>
          </div>
          <div>
            <p className="text-[10px] md:text-sm text-muted-foreground">Month Net</p>
            <p className={`text-xs md:text-lg font-semibold ${
              monthlyTotals.net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(monthlyTotals.net)}
            </p>
          </div>
        </div>
      </div>

      <Card className="m-1 md:m-4">
        <div className="w-full overflow-hidden">
          <table className="w-full table-fixed border-collapse text-[10px] md:text-sm lg:text-base">
            <thead className="sticky top-0 bg-background z-10">
              <tr>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <th key={day} className="p-0.5 lg:p-2 text-center font-medium text-muted-foreground border w-[14.28%]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {Array.from({ length: 5 }, (_, weekIndex) => (
                <tr key={weekIndex} className="divide-x">
                  {Array.from({ length: 7 }, (_, dayIndex) => {
                    const dayNumber = calendarData[weekIndex * 7 + dayIndex];
                    if (dayNumber === null) {
                      return <td key={dayIndex} className="border p-0.5 lg:p-2 bg-muted/10 h-12 md:h-24 lg:h-48" />;
                    }

                    const isCurrentDay = 
                      dayNumber === today.date() && 
                      selectedMonth === today.month() && 
                      selectedYear === today.year();

                    return (
                      <DayCell
                        key={dayIndex}
                        day={dayNumber}
                        isCurrentDay={isCurrentDay}
                        selectedDay={selectedDay}
                        dayIncomes={getIncomeForDay(dayNumber)}
                        dayBills={getBillsForDay(dayNumber)}
                        onDayClick={handleDayClick}
                      />
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
        selectedMonth={selectedMonth +1}
        selectedYear={selectedYear}
        dayIncomes={getIncomeForDay(selectedDay)}
        dayBills={getBillsForDay(selectedDay)}
        totalIncomeUpToToday={calculateRunningTotals(selectedDay).totalIncome}
        totalBillsUpToToday={calculateRunningTotals(selectedDay).totalBills}
        monthlyTotals={monthlyTotals}
      />
    </div>
  );
}