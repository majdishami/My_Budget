import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Income } from "@/types";
import dayjs from "dayjs";

interface IncomeReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  incomes: Income[];
  dateRange: { from: Date | undefined; to: Date | undefined };
}

export default function IncomeReportDialog({
  isOpen,
  onOpenChange,
  incomes,
  dateRange,
}: IncomeReportDialogProps) {
  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

  const formatDate = (date: string) => {
    return dayjs(date).format("MMM D, YYYY");
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Income Report</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium">
              {dateRange.from && dateRange.to
                ? `${dayjs(dateRange.from).format("MMM D, YYYY")} - ${dayjs(dateRange.to).format("MMM D, YYYY")}`
                : "All Time"}
            </h3>
            <p className="text-xl font-bold mt-2">
              Total Income: {formatAmount(totalIncome)}
            </p>
          </div>

          <div className="border rounded-md overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Source</th>
                  <th className="p-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {incomes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-muted-foreground">
                      No income records found for this period.
                    </td>
                  </tr>
                ) : (
                  incomes.map((income) => (
                    <tr key={income.id} className="border-t">
                      <td className="p-2">{formatDate(income.date)}</td>
                      <td className="p-2">{income.source}</td>
                      <td className="p-2 text-right">{formatAmount(income.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}