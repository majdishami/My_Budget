import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Income, Bill } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import dayjs from "dayjs";

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
  const dailyIncome = dayIncomes.reduce((sum, income) => sum + income.amount, 0);
  const dailyBills = dayBills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalNet = totalIncomeUpToToday - totalBillsUpToToday;

  // Calculate total month's income (Majdi's bi-monthly + Ruba's bi-weekly)
  const totalMonthIncome = (() => {
    const majdiSalary = dayIncomes.find(income => income.source === "Majdi's Salary")?.amount ?? 0;
    const rubaSalary = dayIncomes.find(income => income.source === "Ruba's Salary")?.amount ?? 0;

    // Majdi gets paid twice a month
    const majdiMonthlyTotal = majdiSalary * 2;

    // Ruba gets paid bi-weekly (approximately 2.17 times per month)
    const rubaMonthlyTotal = Math.round(rubaSalary * 2.17);

    return majdiMonthlyTotal + rubaMonthlyTotal;
  })();

  // Calculate total month's expenses
  const totalMonthExpenses = dayBills.reduce((sum, bill) => sum + bill.amount, 0);

  // Calculate remaining amounts based on selected date
  const selectedDate = dayjs()
    .year(selectedYear)
    .month(selectedMonth)
    .date(selectedDay);

  // Calculate remaining amounts
  const remainingIncome = totalMonthIncome - totalIncomeUpToToday;
  const remainingExpenses = totalMonthExpenses - totalBillsUpToToday;
  const remainingBalance = remainingIncome - remainingExpenses;

  const currentDate = selectedDate.format('MMMM D, YYYY');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Financial Summary for {currentDate}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Today's Transactions Section */}
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

          {/* 1st of Month Up To Selected Day Summary */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">1st of Month Up To Selected Day</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
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
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">Balance from 1st till selected date</p>
              <p className={`text-xl font-bold ${
                totalNet >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}>
                {formatCurrency(totalNet)}
              </p>
            </div>
          </Card>

          {/* Remaining Till End Of Month */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Remaining Till End Of Month</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">Balance of Remaining</p>
                <p className={`text-xl font-bold ${
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