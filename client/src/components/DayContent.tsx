import { cn } from "@/lib/utils";
import { Bill, Income } from "@/types";
import { Dot } from "lucide-react";

interface DayContentProps {
  day: Date;
  bills?: Bill[];
  incomes?: Income[];
}

export function DayContent({ day, bills = [], incomes = [] }: DayContentProps) {
  console.log('DayContent rendered for:', day, 'Bills:', bills, 'Incomes:', incomes);

  // Filter bills for this day
  const dayBills = bills.filter(bill => bill.day === day.getDate());

  // Filter incomes for this day
  const dayIncomes = incomes.filter(income => {
    if (income.source === "Ruba's Salary") {
      // For Ruba's salary, check if it's a Friday
      const isFriday = day.getDay() === 5;
      if (!isFriday) return false;

      // Start from January 10, 2025
      const startDate = new Date('2025-01-10');
      const diffTime = Math.abs(day.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const weeksDiff = Math.floor(diffDays / 7);

      return weeksDiff >= 0 && weeksDiff % 2 === 0;
    }

    // For other incomes, check the day of the month
    const incomeDate = new Date(income.date);
    return incomeDate.getDate() === day.getDate();
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