/**
 * ================================================
 * 🎯 Budget Component
 * ================================================
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Income, Bill } from "@/types";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { useData } from "@/contexts/DataContext";
import DailySummaryDialog from "@/components/DailySummaryDialog";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ThemeToggle from "@/components/ThemeToggle"; // Assuming ThemeToggle is imported correctly


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
  const { incomes, bills, isLoading, error } = useData();
  const today = useMemo(() => dayjs(), []);
  const [selectedDay, setSelectedDay] = useState(today.date());
  const [selectedMonth, setSelectedMonth] = useState(today.month());
  const [selectedYear, setSelectedYear] = useState(today.year());
  const [showDailySummary, setShowDailySummary] = useState(false);

  // Memoize months and years arrays
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: dayjs().month(i).format('MMMM')
  })), []);

  const years = useMemo(() => Array.from({ length: 11 }, (_, i) => ({
    value: today.year() - 5 + i,
    label: (today.year() - 5 + i).toString()
  })), [today]);

  // Memoize calendar related calculations
  const calendarData = useMemo(() => {
    const firstDayOfMonth = dayjs().year(selectedYear).month(selectedMonth).startOf("month");
    const lastDayOfMonth = firstDayOfMonth.endOf("month");
    const firstDayIndex = firstDayOfMonth.day();
    const totalDaysInMonth = lastDayOfMonth.date();

    return Array.from({ length: 35 }, (_, index) => {
      const day = index - firstDayIndex + 1;
      return day >= 1 && day <= totalDaysInMonth ? day : null;
    });
  }, [selectedYear, selectedMonth]);

  // Memoize monthly income occurrences calculation
  const monthlyIncomeOccurrences = useMemo(() => {
    const currentDate = dayjs().year(selectedYear).month(selectedMonth);
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const occurrences: Income[] = [];
    const addedDates = new Set<string>();

    incomes.forEach(income => {
      const addIncomeIfNotExists = (date: dayjs.Dayjs, amount: number, occurrenceType: Income['occurrenceType']) => {
        const dateStr = date.format('YYYY-MM-DD');
        if (!addedDates.has(`${income.source}-${dateStr}`)) {
          addedDates.add(`${income.source}-${dateStr}`);
          occurrences.push({
            id: `${income.id}-${dateStr}`,
            source: income.source,
            amount: amount,
            date: date.toISOString(),
            occurrenceType
          });
        }
      };

      if (income.source === "Majdi's Salary") {
        // Add first occurrence on the 1st
        addIncomeIfNotExists(startOfMonth.date(1), 4739, 'twice-monthly');
        // Add second occurrence on the 15th
        addIncomeIfNotExists(startOfMonth.date(15), 4739, 'twice-monthly');
      } else if (income.source === "Ruba's Salary") {
        // Calculate bi-weekly dates starting from Jan 10, 2025
        let checkDate = dayjs('2025-01-10');
        while (checkDate.isBefore(endOfMonth) || checkDate.isSame(endOfMonth)) {
          if ((checkDate.isAfter(startOfMonth) || checkDate.isSame(startOfMonth)) && 
              checkDate.day() === 5) { // Friday
            const weeksDiff = checkDate.diff(dayjs('2025-01-10'), 'week');
            if (weeksDiff >= 0 && weeksDiff % 2 === 0) {
              addIncomeIfNotExists(checkDate, income.amount, 'biweekly');
            }
          }
          checkDate = checkDate.add(1, 'day');
        }
      } else {
        const incomeDate = dayjs(income.date);
        if (incomeDate.month() === selectedMonth && incomeDate.year() === selectedYear) {
          addIncomeIfNotExists(incomeDate, income.amount, income.occurrenceType || 'once');
        }
      }
    });

    return occurrences;
  }, [incomes, selectedYear, selectedMonth]);

  // Memoize functions for getting day specific data
  const getIncomeForDay = useCallback((day: number) => {
    const targetDate = dayjs().year(selectedYear).month(selectedMonth).date(day);
    return monthlyIncomeOccurrences.filter(income => {
      const incomeDate = dayjs(income.date);
      return incomeDate.date() === day && 
             incomeDate.month() === selectedMonth && 
             incomeDate.year() === selectedYear;
    });
  }, [monthlyIncomeOccurrences, selectedYear, selectedMonth]);

  const getBillsForDay = useCallback((day: number) => {
    const targetDate = dayjs().year(selectedYear).month(selectedMonth).date(day);
    return bills.filter(bill => {
      if (bill.isOneTime) {
        const billDate = dayjs(bill.date);
        return billDate && billDate.date() === day && 
               billDate.month() === selectedMonth && 
               billDate.year() === selectedYear;
      }
      return bill.day === day;
    });
  }, [bills, selectedYear, selectedMonth]);

  // Memoize monthly totals calculation
  const monthlyTotals = useMemo(() => {
    // Calculate total income from all income occurrences
    const totalIncome = monthlyIncomeOccurrences.reduce((sum, income) => sum + income.amount, 0);

    // Calculate total expenses, handling both one-time and recurring bills
    const totalExpenses = bills.reduce((sum, bill) => {
      if (bill.isOneTime) {
        const billDate = dayjs(bill.date);
        if (billDate &&
            billDate.month() === selectedMonth && 
            billDate.year() === selectedYear) {
          return sum + bill.amount;
        }
        return sum;
      }
      // For recurring bills, always include them in the monthly total
      return sum + bill.amount;
    }, 0);

    return {
      income: totalIncome,
      expenses: totalExpenses,
      net: totalIncome - totalExpenses
    };
  }, [monthlyIncomeOccurrences, bills, selectedMonth, selectedYear]);

  // Add memoized running totals calculation
  const calculateRunningTotals = useCallback((day: number) => {
    let totalIncome = 0;
    let totalBills = 0;

    const targetDate = dayjs().year(selectedYear).month(selectedMonth).date(day);

    monthlyIncomeOccurrences.forEach(income => {
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
  }, [monthlyIncomeOccurrences, bills, selectedYear, selectedMonth]);


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

                    const currentDate = dayjs().year(selectedYear).month(selectedMonth).date(dayNumber);
                    const dayOfWeek = currentDate.format('ddd');
                    const dayIncomes = getIncomeForDay(dayNumber);
                    const dayBills = getBillsForDay(dayNumber);
                    const hasTransactions = dayIncomes.length > 0 || dayBills.length > 0;
                    const isCurrentDay = 
                      dayNumber === today.date() && 
                      selectedMonth === today.month() && 
                      selectedYear === today.year();

                    return (
                      <td
                        key={dayIndex}
                        onClick={() => {
                          setSelectedDay(dayNumber);
                          setShowDailySummary(true);
                        }}
                        aria-label={`${dayNumber} ${dayjs().month(selectedMonth).format("MMMM")} ${selectedYear}${isCurrentDay ? ' (Today)' : ''}`}
                        className={cn(
                          "border p-0.5 lg:p-2 align-top cursor-pointer transition-colors h-12 md:h-24 lg:h-48 relative touch-manipulation",
                          "hover:bg-accent active:bg-accent/70",
                          isCurrentDay && "ring-2 ring-primary ring-offset-2",
                          selectedDay === dayNumber && "bg-accent/50",
                          hasTransactions && "shadow-sm"
                        )}
                      >
                        <div className="flex justify-between items-start mb-0.5">
                          <div className="flex items-center gap-0.5">
                            <span className={cn(
                              "font-medium text-xs md:text-base lg:text-lg",
                              isCurrentDay && "text-primary font-bold"
                            )}>
                              {dayNumber}
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
                          {dayIncomes.length > 0 && (
                            <div className="space-y-0.5">
                              {dayIncomes.map((income, index) => (
                                <div 
                                  key={income.id} 
                                  className="flex justify-between items-center text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded px-0.5"
                                >
                                  <span className="truncate max-w-[60%] text-[8px] md:text-xs">
                                    {index + 1}. {income.source}
                                  </span>
                                  <span className="font-medium shrink-0 text-[8px] md:text-xs">
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
                                  className="flex justify-between items-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded px-0.5"
                                >
                                  <span className="truncate max-w-[60%] text-[8px] md:text-xs">
                                    {index + 1}. {bill.name}
                                  </span>
                                  <span className="font-medium shrink-0 text-[8px] md:text-xs">
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

      <DailySummaryDialog
        isOpen={showDailySummary}
        onOpenChange={setShowDailySummary}
        selectedDay={selectedDay}
        selectedMonth={selectedMonth}
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