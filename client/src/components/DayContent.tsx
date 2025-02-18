import { cn } from "@/lib/utils";
import { Bill, Income } from "@/types";
import { Dot } from "lucide-react";
import dayjs from 'dayjs';

interface DayContentProps {
  day: Date;
  bills?: Bill[];
  incomes?: Income[];
  onClick?: (dayNumber: number) => void;
}

export function DayContent({ day, bills = [], incomes = [], onClick }: DayContentProps) {
  const currentMonth = dayjs(day).month();
  const currentYear = dayjs(day).year();

  // Filter bills to only show those in the current month
  const hasExpenseOnDay = bills.some(bill => {
    const billDate = dayjs(bill.date);
    return billDate.date() === day.getDate() && 
           billDate.month() === currentMonth && 
           billDate.year() === currentYear;
  });

  // Filter incomes to only show those in the current month
  const hasIncomeOnDay = (incomes ?? []).some(income => {
    const incomeDate = dayjs(income.date);
    return incomeDate.date() === day.getDate() && 
           incomeDate.month() === currentMonth && 
           incomeDate.year() === currentYear;
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