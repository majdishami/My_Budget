import { cn } from "@/lib/utils";
import { Bill, Income } from "@/types";
import { Dot } from "lucide-react";

interface DayContentProps {
  day: Date;
  bills: Bill[];
  incomes: Income[];
}

export function DayContent({ day, bills, incomes }: DayContentProps) {
  const dayBills = bills.filter(bill => {
    const billDate = new Date(bill.date || `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(bill.day).padStart(2, '0')}`);
    return billDate.getDate() === day.getDate() && billDate.getMonth() === day.getMonth();
  });

  const dayIncomes = incomes.filter(income => {
    if (income.occurrenceType === 'twice-monthly') {
      const firstDate = income.firstDate || 1;
      const secondDate = income.secondDate || 15;
      return day.getDate() === firstDate || day.getDate() === secondDate;
    }
    const incomeDate = new Date(income.date);
    return incomeDate.getDate() === day.getDate() && incomeDate.getMonth() === day.getMonth();
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
