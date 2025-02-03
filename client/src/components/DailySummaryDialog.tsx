import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

interface DailySummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dailySummary: {
    date: string;
    income: number;
    bills: number;
    net: number;
  };
}

export default function DailySummaryDialog({
  isOpen,
  onClose,
  dailySummary
}: DailySummaryDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{dailySummary.date}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Daily Income:</span>
              <span className="text-green-600 dark:text-green-400">
                {formatCurrency(dailySummary.income)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Daily Bills:</span>
              <span className="text-red-600 dark:text-red-400">
                {formatCurrency(dailySummary.bills)}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Net Balance:</span>
              <span className={dailySummary.net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                {formatCurrency(dailySummary.net)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}