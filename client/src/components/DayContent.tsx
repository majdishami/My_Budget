import { cn } from "@/lib/utils";
import { Bill, Income } from "@/types";
import { Dot } from "lucide-react";

interface DayContentProps {
  day: Date;
  bills?: Bill[];
  incomes?: Income[];
  onClick?: (dayNumber: number) => void;
}

export function DayContent({ day, bills = [], incomes = [], onClick }: DayContentProps) {
  // Group bills by day to show only one indicator per day
  const hasExpenseOnDay = bills.some(bill => {
    const billDate = new Date(bill.date);
    return billDate.getDate() === day.getDate();
  });

  // Group incomes by source and day
  const hasIncomeOnDay = (incomes ?? []).some(income => {
    const incomeDate = new Date(income.date);
    return incomeDate.getDate() === day.getDate();
  });

  const handleClick = () => {
    onClick?.(day.getDate());
  };

  return (
    <div 
      className="relative w-full h-full cursor-pointer" 
      onClick={handleClick}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {day.getDate()}
      </div>
      {(hasIncomeOnDay || hasExpenseOnDay) && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
          {hasIncomeOnDay && (
            <Dot className="h-3 w-3 text-green-500" />
          )}
          {hasExpenseOnDay && (
            <Dot className="h-3 w-3 text-red-500" />
          )}
        </div>
      )}
    </div>
  );
}