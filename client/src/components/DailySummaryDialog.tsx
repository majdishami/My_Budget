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
import { X, Loader2 } from "lucide-react";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";

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
  const selectedDate = dayjs().year(selectedYear).month(selectedMonth).date(selectedDay);
  const currentDate = selectedDate.format('MMMM D, YYYY');

  const dailyIncome = dayIncomes.reduce((sum, income) => sum + income.amount, 0);
  const dailyBills = dayBills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalNet = totalIncomeUpToToday - totalBillsUpToToday;

  // Calculate remaining values using the provided monthly totals
  const remainingIncome = monthlyTotals.income - totalIncomeUpToToday;
  const remainingExpenses = monthlyTotals.expenses - totalBillsUpToToday;
  const remainingBalance = remainingIncome - remainingExpenses;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Financial Summary for {currentDate}</DialogTitle>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-6">
          {/* Today's Activity */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Today's Activity</h3>

            {/* Income Details */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Income Transactions</h4>
              {dayIncomes.length > 0 ? (
                <div className="space-y-2">
                  {dayIncomes.map((income) => (
                    <div 
                      key={income.id} 
                      className="flex justify-between items-center text-sm bg-green-50 dark:bg-green-950/30 p-2 rounded"
                    >
                      <span>{income.source}</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(income.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No income transactions today</p>
              )}
            </div>

            {/* Expense Details */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Expense Transactions</h4>
              {dayBills.length > 0 ? (
                <div className="space-y-2">
                  {dayBills.map((bill) => (
                    <div 
                      key={bill.id} 
                      className="flex justify-between items-center text-sm bg-red-50 dark:bg-red-950/30 p-2 rounded"
                    >
                      <span>{bill.name}</span>
                      <span className="font-medium text-red-600 dark:text-red-400">
                        {formatCurrency(bill.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No expense transactions today</p>
              )}
            </div>

            {/* Daily Summary */}
            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-sm">
                  <p className="text-muted-foreground">Total Day's Income</p>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(dailyIncome)}
                  </p>
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground">Total Day's Expenses</p>
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(dailyBills)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Running Totals */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Running Totals (Month to Date)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm">
                <p className="text-muted-foreground">Total Income</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(totalIncomeUpToToday)}
                </p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Total Expenses</p>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(totalBillsUpToToday)}
                </p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Net Balance</p>
                <p className={`text-lg font-semibold ${
                  totalNet >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}>
                  {formatCurrency(totalNet)}
                </p>
              </div>
            </div>
          </Card>

          {/* Remaining Till End Of Month */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Remaining Till End Of Month</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm">
                <p className="text-muted-foreground">Remaining Income</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(remainingIncome)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  From total {formatCurrency(monthlyTotals.income)}
                </p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Remaining Expenses</p>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(remainingExpenses)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  From total {formatCurrency(monthlyTotals.expenses)}
                </p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Balance of Remaining</p>
                <p className={`text-lg font-semibold ${
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