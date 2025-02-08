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
  totalBillsUpToToday
}: DailySummaryDialogProps) {
  const selectedDate = dayjs().year(selectedYear).month(selectedMonth).date(selectedDay);
  const currentDate = selectedDate.format('MMMM D, YYYY');

  const dailyIncome = dayIncomes.reduce((sum, income) => sum + income.amount, 0);
  const dailyBills = dayBills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalNet = totalIncomeUpToToday - totalBillsUpToToday;

  // Predefined monthly totals for the year 2025
  const monthlyTotals = {
    0: { income: 13814, expenses: 11031 }, // January
    1: { income: 13814, expenses: 11031 }, // February
    2: { income: 13814, expenses: 11031 }, // March
    3: { income: 13814, expenses: 11031 }, // April
    4: { income: 13814, expenses: 11031 }, // May
    5: { income: 13814, expenses: 11031 }, // June
    6: { income: 13814, expenses: 11031 }, // July
    7: { income: 13814, expenses: 11031 }, // August
    8: { income: 13814, expenses: 11031 }, // September
    9: { income: 13814, expenses: 11031 }, // October
    10: { income: 13814, expenses: 11031 }, // November
    11: { income: 13814, expenses: 11031 }, // December
  };

  // Get the total income and expenses for the selected month
  const totalMonthIncome = monthlyTotals[selectedMonth].income;
  const totalMonthExpenses = monthlyTotals[selectedMonth].expenses;

  // 1. Remaining Income = Total income of the selected month - total income incurred till the day selected
  const remainingIncome = totalMonthIncome - totalIncomeUpToToday;

  // 2. Remaining Expenses = total expenses of the selected month - total expenses incurred till the day selected
  const remainingExpenses = totalMonthExpenses - totalBillsUpToToday;

  // 3. Balance of Remaining = Remaining Income - Remaining Expenses
  const remainingBalance = remainingIncome - remainingExpenses;

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
                  {dayIncomes.map((income, index) => (
                    <div key={income.id} className="flex justify-between items-center text-sm bg-green-50 dark:bg-green-950/30 p-2 rounded">
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
                  {dayBills.map((bill, index) => (
                    <div key={bill.id} className="flex justify-between items-center text-sm bg-red-50 dark:bg-red-950/30 p-2 rounded">
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

          {/* 1st of Month Up To Selected Day */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">1st of Month Up To Selected Day</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm">
                <p className="text-muted-foreground">Incurred Income</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(totalIncomeUpToToday)}
                </p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Incurred Expenses</p>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(totalBillsUpToToday)}
                </p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Balance</p>
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
                  From total {formatCurrency(totalMonthIncome)}
                </p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Remaining Expenses</p>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(remainingExpenses)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  From total {formatCurrency(totalMonthExpenses)}
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