import { cn } from "@/lib/utils";
import { Bill, Income } from "@/types";
import { Dot } from "lucide-react";

interface DayContentProps {
  day: Date;
  bills: Bill[];
  incomes: Income[];
}

export function DayContent({ day, bills, incomes }: DayContentProps) {
  // Filter bills for this day
  const dayBills = bills.filter(bill => {
    if (bill.isOneTime && bill.date) {
      // For one-time bills, check the exact date
      return new Date(bill.date).toDateString() === day.toDateString();
    }
    // For recurring bills, check the day of month
    return bill.day === day.getDate();
  });

  // Filter incomes for this day
  const dayIncomes = incomes.filter(income => {
    if (income.occurrenceType === 'twice-monthly') {
      // For twice-monthly incomes, check both dates
      const firstDate = income.firstDate || 1;
      const secondDate = income.secondDate || 15;
      return day.getDate() === firstDate || day.getDate() === secondDate;
    } else if (income.occurrenceType === 'once' && income.date) {
      // For one-time incomes, check the exact date
      return new Date(income.date).toDateString() === day.toDateString();
    } else if (income.occurrenceType === 'biweekly' && income.date) {
      // For bi-weekly incomes, calculate the dates
      const startDate = new Date(income.date);
      const diffTime = Math.abs(day.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays % 14 === 0;
    }
    // For monthly incomes, check the day of month
    return new Date(income.date).getDate() === day.getDate();
  });

  const hasTransactions = dayBills.length > 0 || dayIncomes.length > 0;

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 flex items-center justify-center">
        {day.getDate()}
      </div>
      {hasTransactions && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
          {dayIncomes.length > 0 && (
            <Dot className="h-3 w-3 text-green-500" />
          )}
          {dayBills.length > 0 && (
            <Dot className="h-3 w-3 text-red-500" />
          )}
        </div>
      )}
    </div>
  );
}