import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Income, Bill } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface DailySummaryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDay: number;
  dayIncomes: Income[];
  dayBills: Bill[];
  totalIncomeUpToToday: number;
  totalBillsUpToToday: number;
}

export default function DailySummaryDialog({
  isOpen,
  onOpenChange,
  selectedDay,
  dayIncomes,
  dayBills,
  totalIncomeUpToToday,
  totalBillsUpToToday
}: DailySummaryDialogProps) {
  const dailyIncome = dayIncomes.reduce((sum, income) => sum + income.amount, 0);
  const dailyBills = dayBills.reduce((sum, bill) => sum + bill.amount, 0);
  const dailyNet = dailyIncome - dailyBills;
  const totalNet = totalIncomeUpToToday - totalBillsUpToToday;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Daily Summary - Day {selectedDay}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Today's Transactions</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Income:</span>
                <span className="text-green-600 dark:text-green-400">
                  {formatCurrency(dailyIncome)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Bills:</span>
                <span className="text-red-600 dark:text-red-400">
                  {formatCurrency(dailyBills)}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Net:</span>
                <span className={dailyNet >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  {formatCurrency(dailyNet)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Month-to-Date</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Income:</span>
                <span className="text-green-600 dark:text-green-400">
                  {formatCurrency(totalIncomeUpToToday)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Bills:</span>
                <span className="text-red-600 dark:text-red-400">
                  {formatCurrency(totalBillsUpToToday)}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Net Balance:</span>
                <span className={totalNet >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  {formatCurrency(totalNet)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}