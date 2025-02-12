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

      if (income.occurrenceType === 'twice-monthly') {
        if (income.firstDate) {
          addIncomeIfNotExists(startOfMonth.date(income.firstDate), income.amount / 2, 'twice-monthly');
        }
        if (income.secondDate) {
          addIncomeIfNotExists(startOfMonth.date(income.secondDate), income.amount / 2, 'twice-monthly');
        }
      } else if (income.occurrenceType === 'biweekly') {
        let checkDate = dayjs('2025-01-10');
        while (checkDate.isBefore(endOfMonth) || checkDate.isSame(endOfMonth)) {
          if ((checkDate.isAfter(startOfMonth) || checkDate.isSame(startOfMonth)) && 
              checkDate.day() === 5) {
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
    const totalIncome = monthlyIncomeOccurrences.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = bills.reduce((sum, bill) => {
      if (bill.isOneTime) {
        const billDate = dayjs(bill.date);
        return billDate &&
               billDate.month() === selectedMonth && 
               billDate.year() === selectedYear 
               ? sum + bill.amount 
               : sum;
      }
      return sum + bill.amount;
    }, 0);

    return {
      income: totalIncome,
      expenses: totalExpenses,
      net: totalIncome - totalExpenses
    };
  }, [monthlyIncomeOccurrences, bills, selectedMonth, selectedYear]);

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
      <div className="flex items-center justify-between p-4 border-b sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </select>

          {selectedMonth === today.month() && selectedYear === today.year() && (
            <span className="text-sm text-muted-foreground ml-2">
              {today.format('ddd')}, {today.format('D')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Month Total Income</p>
            <p className="text-lg font-semibold text-green-600">
              {formatCurrency(monthlyTotals.income)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Month Total Bills</p>
            <p className="text-lg font-semibold text-red-600">
              {formatCurrency(monthlyTotals.expenses)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Month Net Balance</p>
            <p className={`text-lg font-semibold ${
              monthlyTotals.net >= 0 ? 'text-blue-600' : 'text-red-600'
            }`}>
              {formatCurrency(monthlyTotals.net)}
            </p>
          </div>
        </div>
      </div>

      <Card className="m-4">
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
                    const dayNumber = calendarData[weekIndex * 7 + dayIndex];
                    if (dayNumber === null) {
                      return <td key={dayIndex} className="border p-1 lg:p-2 bg-muted/10 h-24 lg:h-48" />;
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
                          "border p-1 lg:p-2 align-top cursor-pointer transition-colors h-24 lg:h-48 relative touch-manipulation",
                          "hover:bg-accent",
                          isCurrentDay && "ring-2 ring-primary ring-offset-2",
                          selectedDay === dayNumber && "bg-accent/50",
                          hasTransactions && "shadow-sm"
                        )}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-1">
                            <span className={cn(
                              "font-medium text-base lg:text-lg",
                              isCurrentDay && "text-primary font-bold"
                            )}>
                              {dayNumber}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {dayOfWeek}
                            </span>
                            {isCurrentDay && (
                              <span className="text-xs font-medium text-primary ml-1 animate-pulse px-1 rounded">
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

      <DailySummaryDialog
        isOpen={showDailySummary}
        onOpenChange={setShowDailySummary}
        selectedDay={selectedDay}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        dayIncomes={getIncomeForDay(selectedDay)}
        dayBills={getBillsForDay(selectedDay)}
        totalIncomeUpToToday={monthlyTotals.income}
        totalBillsUpToToday={monthlyTotals.expenses}
        monthlyTotals={monthlyTotals}
      />
    </div>
  );
}