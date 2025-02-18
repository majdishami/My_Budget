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
  // Get unique incomes by source for this day and sort by amount descending
  const uniqueIncomes = (incomes ?? []).reduce((acc: Income[], income) => {
    const exists = acc.find(i => i.source === income.source);
    if (!exists) {
      acc.push(income);
    }
    return acc;
  }, []).sort((a, b) => b.amount - a.amount);

  // Get bills for this day and sort by amount descending
  const dayBills = (bills ?? []).sort((a, b) => b.amount - a.amount);

  const hasTransactions = uniqueIncomes.length > 0 || dayBills.length > 0;

  const handleClick = () => {
    // Use optional chaining to safely call onClick
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
      {hasTransactions && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
          {uniqueIncomes.length > 0 && (
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