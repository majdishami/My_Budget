import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Income, Bill } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import { memo, useMemo } from 'react';

dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

interface DailySummaryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDay: number;
  selectedMonth: number;
  selectedYear: number;
  dayIncomes: Income[];
  dayBills: Bill[];
  totalIncomeUpToToday: number;
  totalBillsUpToToday: number;
  monthlyTotals: {
    income: number;
    expenses: number;
  };
}

// Memoized TransactionCard component with mobile optimization
const TransactionCard = memo(({ 
  title, 
  items, 
  type 
}: { 
  title: string; 
  items: (Income | Bill)[]; 
  type: 'income' | 'bill' 
}) => {
  return (
    <div className="mb-2 md:mb-4">
      <h4 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">{title}</h4>
      {items.length > 0 ? (
        <div className="space-y-1 md:space-y-2">
          {items.map((item) => (
            <div 
              key={item.id} 
              className={`flex justify-between items-center text-[10px] md:text-sm ${
                type === 'income' 
                  ? 'bg-green-50 dark:bg-green-950/30' 
                  : 'bg-red-50 dark:bg-red-950/30'
              } p-1 md:p-2 rounded`}
            >
              <span className="truncate max-w-[60%]">
                {type === 'income' ? (item as Income).source : (item as Bill).name}
              </span>
              <span className={`font-medium ${
                type === 'income' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] md:text-sm text-muted-foreground">No {type} transactions today</p>
      )}
    </div>
  );
});

TransactionCard.displayName = 'TransactionCard';

export default function DailySummaryDialog({
  isOpen,
  onOpenChange,
  selectedDay,
  selectedMonth,
  selectedYear,
  dayIncomes,
  dayBills,
  totalIncomeUpToToday,
  totalBillsUpToToday,
  monthlyTotals,
}: DailySummaryDialogProps) {
  const selectedDate = useMemo(() => {
    // Create date using the passed year, month, and day
    // Note: month parameter is 0-based in dayjs
    return dayjs().year(selectedYear).month(selectedMonth).date(selectedDay);
  }, [selectedYear, selectedMonth, selectedDay]);

  const currentDate = useMemo(() => 
    selectedDate.format('MMMM D, YYYY'),
    [selectedDate]
  );

  const { dailyIncome, dailyBills, totalNet } = useMemo(() => ({
    dailyIncome: dayIncomes.reduce((sum, income) => sum + income.amount, 0),
    dailyBills: dayBills.reduce((sum, bill) => sum + bill.amount, 0),
    totalNet: totalIncomeUpToToday - totalBillsUpToToday
  }), [dayIncomes, dayBills, totalIncomeUpToToday, totalBillsUpToToday]);

  const { remainingIncome, remainingExpenses, remainingBalance } = useMemo(() => ({
    remainingIncome: monthlyTotals.income - totalIncomeUpToToday,
    remainingExpenses: monthlyTotals.expenses - totalBillsUpToToday,
    remainingBalance: (monthlyTotals.income - totalIncomeUpToToday) - 
                     (monthlyTotals.expenses - totalBillsUpToToday)
  }), [monthlyTotals, totalIncomeUpToToday, totalBillsUpToToday]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-2 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-sm md:text-xl">
            Financial Summary for {currentDate}
          </DialogTitle>
          <DialogClose className="absolute right-1 md:right-4 top-1 md:top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-3 w-3 md:h-4 md:w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-3 md:space-y-6">
          {/* Today's Activity */}
          <Card className="p-2 md:p-4">
            <h3 className="text-xs md:text-lg font-semibold mb-2 md:mb-4">Today's Activity</h3>

            {/* Income Details */}
            <TransactionCard 
              title="Income Transactions" 
              items={dayIncomes} 
              type="income" 
            />

            {/* Expense Details */}
            <TransactionCard 
              title="Expense Transactions" 
              items={dayBills} 
              type="bill" 
            />

            {/* Daily Summary */}
            <div className="pt-2 md:pt-4 border-t">
              <div className="grid grid-cols-2 gap-1 md:gap-4">
                <div className="text-[10px] md:text-sm">
                  <p className="text-muted-foreground">Total Day's Income</p>
                  <p className="text-xs md:text-lg font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(dailyIncome)}
                  </p>
                </div>
                <div className="text-[10px] md:text-sm">
                  <p className="text-muted-foreground">Total Day's Expenses</p>
                  <p className="text-xs md:text-lg font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(dailyBills)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Running Totals */}
          <Card className="p-2 md:p-4">
            <h3 className="text-xs md:text-lg font-semibold mb-2 md:mb-4">Running Totals (Month to Date)</h3>
            <div className="grid grid-cols-3 gap-1 md:gap-4">
              <div className="text-[10px] md:text-sm">
                <p className="text-muted-foreground">Total Income</p>
                <p className="text-xs md:text-lg font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(totalIncomeUpToToday)}
                </p>
              </div>
              <div className="text-[10px] md:text-sm">
                <p className="text-muted-foreground">Total Expenses</p>
                <p className="text-xs md:text-lg font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(totalBillsUpToToday)}
                </p>
              </div>
              <div className="text-[10px] md:text-sm">
                <p className="text-muted-foreground">Net Balance</p>
                <p className={`text-xs md:text-lg font-semibold ${
                  totalNet >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}>
                  {formatCurrency(totalNet)}
                </p>
              </div>
            </div>
          </Card>

          {/* Remaining Till End Of Month */}
          <Card className="p-2 md:p-4">
            <h3 className="text-xs md:text-lg font-semibold mb-2 md:mb-4">Remaining Till End Of Month</h3>
            <div className="grid grid-cols-3 gap-1 md:gap-4">
              <div className="text-[10px] md:text-sm">
                <p className="text-muted-foreground">Remaining Income</p>
                <p className="text-xs md:text-lg font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(remainingIncome)}
                </p>
                <p className="text-[8px] md:text-xs text-muted-foreground mt-1">
                  From total {formatCurrency(monthlyTotals.income)}
                </p>
              </div>
              <div className="text-[10px] md:text-sm">
                <p className="text-muted-foreground">Remaining Expenses</p>
                <p className="text-xs md:text-lg font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(remainingExpenses)}
                </p>
                <p className="text-[8px] md:text-xs text-muted-foreground mt-1">
                  From total {formatCurrency(monthlyTotals.expenses)}
                </p>
              </div>
              <div className="text-[10px] md:text-sm">
                <p className="text-muted-foreground">Balance of Remaining</p>
                <p className={`text-xs md:text-lg font-semibold ${
                  remainingBalance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}>
                  {formatCurrency(remainingBalance)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}