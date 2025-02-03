import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/reportUtils";
import { Income, Bill } from "@/types";

interface DailySummaryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDay: number;
  dayIncomes: Income[];
  dayBills: Bill[];
  totalIncomeUpToToday: number;
  totalBillsUpToToday: number;
}

export function DailySummaryDialog({
  isOpen,
  onOpenChange,
  selectedDay,
  dayIncomes,
  dayBills,
  totalIncomeUpToToday,
  totalBillsUpToToday,
}: DailySummaryDialogProps) {
  const dailyIncome = dayIncomes.reduce((sum, income) => sum + income.amount, 0);
  const dailyBills = dayBills.reduce((sum, bill) => sum + bill.amount, 0);
  const dailyBalance = dailyIncome - dailyBills;
  const runningBalance = totalIncomeUpToToday - totalBillsUpToToday;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Day {selectedDay} Summary</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Today's Transactions</h3>
            <div className="space-y-3">
              {dayIncomes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-600 dark:text-green-400">Income</h4>
                  <ul className="mt-1 space-y-1">
                    {dayIncomes.map((income, index) => (
                      <li key={index} className="text-sm flex justify-between">
                        <span>{income.source}</span>
                        <span className="text-green-600 dark:text-green-400">
                          {formatCurrency(income.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {dayBills.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-red-600 dark:text-red-400">Bills</h4>
                  <ul className="mt-1 space-y-1">
                    {dayBills.map((bill, index) => (
                      <li key={index} className="text-sm flex justify-between">
                        <span>{bill.name}</span>
                        <span className="text-red-600 dark:text-red-400">
                          {formatCurrency(bill.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-medium mb-2">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Daily Income:</span>
                <span className="text-green-600 dark:text-green-400">
                  {formatCurrency(dailyIncome)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Daily Bills:</span>
                <span className="text-red-600 dark:text-red-400">
                  {formatCurrency(dailyBills)}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Daily Balance:</span>
                <span className={dailyBalance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  {formatCurrency(dailyBalance)}
                </span>
              </div>
              <div className="pt-2 border-t flex justify-between font-medium">
                <span>Running Balance:</span>
                <span className={runningBalance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  {formatCurrency(runningBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
