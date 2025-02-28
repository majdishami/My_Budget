// Important: Calendar must always use table format to maximize transaction visibility in day cells
// Do not change this to any other format (like the default calendar component)
import { useState, useMemo, useCallback, memo } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { Income, Bill } from "../types";
import { cn } from "../lib/utils";
import { useData } from "../contexts/DataContext";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import React from "react";

// Initialize dayjs plugins
dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);

// Set default timezone to local
dayjs.tz.setDefault(dayjs.tz.guess());

let nextId = 1; // Initialize a counter for IDs

const generateId = () => nextId++; // Generates sequential numeric IDs


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
          ? 'text-green-600 dark:text-green-400 bg-green-950/30' 
          : 'text-red-600 dark:text-red-400 bg-red-950/30'
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
  onDayClick, 
  selectedMonth, 
  selectedYear,
  calendarData,
}: { 
  day: number;
  isCurrentDay: boolean;
  selectedDay: number;
  dayIncomes: Income[];
  dayBills: Bill[];
  onDayClick: (day: number) => void;
  selectedMonth: number;
  selectedYear: number;
  calendarData: (number | null)[];
}) => {
  const sortedIncomes = [...dayIncomes].sort((a, b) => b.amount - a.amount);
  const sortedBills = [...dayBills].sort((a, b) => b.amount - a.amount);
  const hasTransactions = sortedIncomes.length > 0 || sortedBills.length > 0;
  const dayDate = dayjs().year(selectedYear).month(selectedMonth).date(day);
  const dayOfWeek = dayDate.format('ddd');

  return (
    <td
      onClick={() => onDayClick(day)}
      className={cn(
        "border border-yellow-100/50 p-0.5 lg:p-2 align-top cursor-pointer transition-colors h-12 md:h-24 lg:h-48 relative touch-manipulation",
        "hover:bg-accent active:bg-accent/70",
        isCurrentDay && "ring-2 ring-primary ring-offset-2 bg-yellow-100/50",
        selectedDay === day && "bg-accent/50",
        hasTransactions && "shadow-sm"
      )}
    >
      <div className="flex justify-between items-start mb-0.5">
        <div className="flex items-center gap-1">
          {isCurrentDay ? (
            <>
              <span className="font-bold text-sm md:text-base lg:text-primary bg-yellow-200 px-1 rounded">
                {day}
              </span>
              <span className="text-[10px] text-primary bg-yellow-200 px-1 rounded">
                {dayOfWeek}
              </span>
            </>
          ) : (
            <>
              <span className="font-medium text-sm md:text-base lg:text-lg">
                {day}
              </span>
              <span className="hidden md:inline text-[10px] text-muted-foreground">
                {dayOfWeek}
              </span>
            </>
          )}
          </div>
          {hasTransactions && (
            <div className="flex gap-0.5">
              {sortedIncomes.length > 0 && (
                <div className="w-1 h-1 md:w-2 md:h-2 rounded-full bg-green-500" />
              )}
              {sortedBills.length > 0 && (
                <div className="w-1 h-1 md:w-2 md:h-2 rounded-full bg-red-500" />
              )}
            </div>
          )}
        </div>
      </td>
    );
  }
);

DayCell.displayName = 'DayCell';

DayCell.displayName = 'DayCell';

DayCell.displayName = 'DayCell';

export function Budget() {
  const { incomes, bills: rawBills, isLoading, error } = useData();
  const today = useMemo(() => dayjs(), []);
  const [selectedDay, setSelectedDay] = useState(today.date());
  const [selectedMonth, setSelectedMonth] = useState(today.month() + 1); // Changed to 0-based
  const [selectedYear, setSelectedYear] = useState(today.year());
  const [showDailySummary, setShowDailySummary] = useState(false);

  // Transform bills to have proper recurrence flags
  const bills = useMemo(() => rawBills.map(bill => ({
    ...bill,
    isOneTime: false, // Default to monthly recurring bills
    isYearly: false, // No yearly bills in this set
    date: undefined, // Clear any date as these are monthly recurring
  })), [rawBills]);

  // Calculate daysInMonth early
  const daysInMonth = useMemo(() => {
    return dayjs().year(selectedYear).month(selectedMonth).daysInMonth();
  }, [selectedYear, selectedMonth]);

  // Optimize months and years calculations
  const months = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      value: i, // Changed to 0-based
      label: dayjs().month(i).format('MMMM')
    })), 
  []);
  const years = useMemo(() => 
    Array.from({ length: 6 }, (_, i) => ({
      value: 2025 + i,
      label: (2025 + i).toString()
    })), 
  []);

  // Update getIncomeForDay to handle recurring incomes across all months
  const getIncomeForDay = useCallback((day: number) => {
    if (day <= 0) return [];

    const uniqueIncomes = new Set();
    const result: Income[] = [];

    // Handle Majdi's salary (1st and 15th)
    if (day === 1 || day === 15) {
      const majdiSalary = {
        id: generateId(),
        source: "Majdi's Salary",
        amount: 4739,
        date: dayjs().year(selectedYear).month(selectedMonth).date(day).format('YYYY-MM-DD'),
        occurrenceType: 'twice-monthly' as const
      };
      uniqueIncomes.add("Majdi's Salary");
      result.push(majdiSalary);
    }

    // Handle Ruba's bi-weekly salary
    const currentDate = dayjs()
      .year(selectedYear)
      .month(selectedMonth)
      .date(day);

    // Only process if it's a Friday
    if (currentDate.day() === 5) {
      const startDate = dayjs('2025-01-10'); // First payment date

      // Calculate if this is a valid payday by checking the exact number of weeks
      const weeksDiff = Math.floor(currentDate.diff(startDate, 'days') / 7);

      // Only include if the date is on or after start date and matches biweekly pattern
      if (currentDate.isSameOrAfter(startDate) && weeksDiff % 2 === 0) {
        const rubaSalary = {
          id: generateId(),
          source: "Ruba's Salary",
          amount: 2168,
          date: currentDate.format('YYYY-MM-DD'),
          occurrenceType: 'biweekly' as const
        };
        uniqueIncomes.add("Ruba's Salary");
        result.push(rubaSalary);
      }
    }

    // Handle one-time incomes
    incomes.forEach(income => {
      const incomeDate = dayjs(income.date);
      if (
        incomeDate.date() === day && 
        incomeDate.month() === selectedMonth && 
        incomeDate.year() === selectedYear && 
        !uniqueIncomes.has(income.source)
      ) {
        uniqueIncomes.add(income.source);
        result.push(income);
      }
    });

    return result;
  }, [incomes, selectedYear, selectedMonth]);

  // Update getBillsForDay function to handle date calculations consistently
  const getBillsForDay = useCallback((day: number) => {
    if (day <= 0 || day > daysInMonth) return [];

    return bills.filter(bill => {
      if (bill.isOneTime && bill.date) {
        const billDate = dayjs(bill.date);
        return billDate.year() === selectedYear && 
          billDate.month() === selectedMonth && 
          billDate.date() === day;
      } else if (bill.isYearly && bill.yearly_date) {
        const yearlyDate = dayjs(bill.yearly_date);
        return yearlyDate.month() === selectedMonth && 
          yearlyDate.date() === day;
      } else {
        // Monthly recurring bill
        return bill.date === day;
      }
    }).map(bill => ({
      ...bill,
      id: `${bill.id}-${selectedMonth}-${selectedYear}`,
      date: dayjs()
        .year(selectedYear)
        .month(selectedMonth)
        .date(day)
        .format('YYYY-MM-DD')
    }));
  }, [bills, selectedYear, selectedMonth, daysInMonth]);

  // Update monthlyTotals calculation to use consistent date handling
  const monthlyTotals = useMemo(() => {
    let totalIncome = 0;
    let totalBills = 0;

    const processedIncomeSources = new Map<string, { count: number; amount: number }>();

    for (let day = 1; day <= daysInMonth; day++) {
      const dayIncomes = getIncomeForDay(day);
      totalIncome += dayIncomes.reduce((sum, income) => sum + income.amount, 0);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayBills = getBillsForDay(day);
      totalBills += dayBills.reduce((sum, bill) => sum + bill.amount, 0);
    }

    return {
      income: totalIncome,
      expenses: totalBills,
      net: totalIncome - totalBills
    };
  }, [daysInMonth, getIncomeForDay, getBillsForDay]);

  // Calculate running totals for a specific day
  const calculateRunningTotals = useCallback((day: number) => {
    let totalIncome = 0;
    let totalBills = 0;

    // Calculate income up to target date
    for (let currentDay = 1; currentDay <= day; currentDay++) {
      const dayIncomes = getIncomeForDay(currentDay);
      totalIncome += dayIncomes.reduce((sum, income) => sum + income.amount, 0);
    }

    // Calculate bills up to target date
    for (let currentDay = 1; currentDay <= day; currentDay++) {
      const dayBills = getBillsForDay(currentDay);
      totalBills += dayBills.reduce((sum, bill) => sum + bill.amount, 0);
    }

    return { income: totalIncome, expenses: totalBills };
  }, [getIncomeForDay, getBillsForDay]);

  // Handle month and year changes with validation
  const handleMonthChange = useCallback((month: number) => {
    if (selectedMonth !== month) {
      setSelectedMonth(month);
      setSelectedDay(prev => Math.min(prev, dayjs().year(selectedYear).month(month).daysInMonth()));
    }
  }, [selectedMonth, selectedYear]);

  const handleYearChange = useCallback((year: number) => {
    if (selectedYear !== year) {
      setSelectedYear(year);
      setSelectedDay(prev => Math.min(prev, dayjs().year(year).month(selectedMonth).daysInMonth()));
    }
  }, [selectedYear, selectedMonth]);

  // Update the calendarData calculation
  const calendarData = useMemo(() => {
    const firstDayDate = dayjs()
      .year(selectedYear)
      .month(selectedMonth)
      .startOf('month');

    const daysInMonth = firstDayDate.daysInMonth();
    const startWeekday = firstDayDate.day(); // 0-6, Sunday-Saturday

    // Create array for all days
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of month
    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }

    // Add actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    // Add empty cells to complete the grid
    const totalDays = startWeekday + daysInMonth;
    const rowsNeeded = Math.ceil(totalDays / 7);
    const totalCells = rowsNeeded * 7;

    while (days.length < totalCells) {
      days.push(null);
    }

    return days;
  }, [selectedYear, selectedMonth]);

  // Update the current day detection
  const isCurrentDay = useCallback((dayNumber: number) => {
    const now = dayjs();
    return (
      dayNumber === now.date() &&
      selectedMonth === now.month() &&
      selectedYear === now.year()
    );
  }, [selectedMonth, selectedYear]);

  // Precompute transactions for all days in the month
  const dayTransactions = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      incomes: getIncomeForDay(i + 1),
      bills: getBillsForDay(i + 1)
    }));
  }, [daysInMonth, getIncomeForDay, getBillsForDay]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between p-2 md:p-4">
        <div className="flex items-center gap-2 mb-0.5">
          <select 
            value={selectedMonth}
            onChange={(e) => handleMonthChange(parseInt(e.target.value))}
            className="p-1.5 md:p-2 border rounded bg-background min-w-[100px] md:min-w-[100px]"
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
                className="p-1.5 md:p-2 border rounded bg-background min-w-[100px] md:min-w-[100px]"
              >
                {years.map(year => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <th key={day} className="border border-yellow-100/50 p-1 md:p-2">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.ceil(calendarData.length / 7) }).map((_, weekIndex) => (
                <tr key={weekIndex}>
                  {calendarData.slice(weekIndex * 7, weekIndex * 7 + 7).map((day, dayIndex) => (
                    <DayCell
                      key={dayIndex}
                      day={day || 0}
                      isCurrentDay={isCurrentDay(day || 0)}
                      selectedDay={selectedDay}
                      dayIncomes={dayTransactions.find(t => t.day === day)?.incomes || []}
                      dayBills={(dayTransactions.find(t => t.day === day)?.bills || []) as Bill[]}
                      onDayClick={setSelectedDay}
                      selectedMonth={selectedMonth}
                      selectedYear={selectedYear}
                      calendarData={calendarData}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-2 md:p-4">
            <div className="flex justify-between items-center">
              <div className="text-lg font-medium">
                Monthly Totals
              </div>
              <button
                onClick={() => setShowDailySummary(!showDailySummary)}
                className="p-1.5 md:p-2 border rounded bg-background"
              >
                {showDailySummary ? 'Hide' : 'Show'} Daily Summary
              </button>
            </div>
            <div className="mt-2">
              <div className="flex justify-between">
                <div>Total Income:</div>
                <div>{formatCurrency(monthlyTotals.income)}</div>
              </div>
              <div className="flex justify-between">
                <div>Total Expenses:</div>
                <div>{formatCurrency(monthlyTotals.expenses)}</div>
              </div>
              <div className="flex justify-between">
                <div>Net:</div>
                <div>{formatCurrency(monthlyTotals.net)}</div>
              </div>
            </div>
            {showDailySummary && (
              <div className="mt-4">
                <div className="text-lg font-medium">
                  Daily Summary
                </div>
                {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
                  const day = dayIndex + 1;
                  const { income, expenses } = calculateRunningTotals(day);
                  return (
                    <div key={day} className="flex justify-between mt-2">
                      <div>Day {day}:</div>
                      <div>{formatCurrency(income - expenses)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }