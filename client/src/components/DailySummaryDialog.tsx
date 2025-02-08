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
  totalIncomeUpToToday: providedIncomeUpToToday,
  totalBillsUpToToday: providedBillsUpToToday
}: DailySummaryDialogProps) {
  const selectedDate = dayjs().year(selectedYear).month(selectedMonth).date(selectedDay);
  const today = dayjs();

  // For future dates, set incurred totals to 0
  const totalIncomeUpToToday = selectedDate.isAfter(today) ? 0 : providedIncomeUpToToday;
  const totalBillsUpToToday = selectedDate.isAfter(today) ? 0 : providedBillsUpToToday;

  const dailyIncome = dayIncomes.reduce((sum, income) => sum + income.amount, 0);
  const dailyBills = dayBills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalNet = totalIncomeUpToToday - totalBillsUpToToday;

  // Set fixed values for February 2025 or calculate for other months
  const totalMonthIncome = selectedMonth === 1 && selectedYear === 2025 ? 13814 : (() => {
    const majdiSalary = dayIncomes.find(income => income.source === "Majdi's Salary")?.amount ?? 0;
    const rubaSalary = dayIncomes.find(income => income.source === "Ruba's Salary")?.amount ?? 0;

    // Majdi's bi-monthly salary (1st and 15th)
    const majdiMonthlyTotal = majdiSalary * 2;

    // Calculate Ruba's bi-weekly payments for the month
    const startDate = dayjs('2025-01-10');
    const monthStart = dayjs(`${selectedYear}-${selectedMonth + 1}-01`);
    const monthEnd = monthStart.endOf('month');

    let currentDate = startDate.clone();
    let biweeklyPayments = 0;

    // Count bi-weekly payments in the selected month
    while (currentDate.isBefore(monthEnd) || currentDate.isSame(monthEnd, 'day')) {
      if (currentDate.month() === selectedMonth && currentDate.year() === selectedYear) {
        const weeksDiff = currentDate.diff(startDate, 'week');
        if (weeksDiff >= 0 && weeksDiff % 2 === 0) {
          biweeklyPayments++;
        }
      }
      currentDate = currentDate.add(14, 'day');
    }

    const rubaMonthlyTotal = rubaSalary * biweeklyPayments;
    return majdiMonthlyTotal + rubaMonthlyTotal;
  })();

  // Set fixed values for February 2025 or calculate for other months
  const totalMonthExpenses = selectedMonth === 1 && selectedYear === 2025 ? 11031 : 
    dayBills.reduce((sum, bill) => sum + bill.amount, 0);

  // 1. Remaining Income = Total income of the selected month - total income incurred till the day selected
  const remainingIncome = totalMonthIncome - totalIncomeUpToToday;

  // 2. Remaining Expenses = total expenses of the selected month - total expenses incurred till the day selected
  const remainingExpenses = totalMonthExpenses - totalBillsUpToToday;

  // 3. Balance of Remaining = Remaining Income - Remaining Expenses
  const remainingBalance = remainingIncome - remainingExpenses;

  const currentDate = selectedDate.format('MMMM D, YYYY');

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