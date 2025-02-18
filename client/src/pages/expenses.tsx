import { useState } from 'react';
import ExpenseReportDialog from "@/components/ExpenseReportDialog";
import { useLocation } from "wouter";
import { Bill } from "@/types";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import dayjs from "dayjs";
import { useData } from "@/contexts/DataContext";

export default function ExpenseReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [, setLocation] = useLocation();
  const { bills, transactions } = useData();
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });

  // Filter transactions based on date range
  const filteredTransactions = transactions.filter(transaction => {
    if (!dateRange.from || !dateRange.to) return true;
    const transactionDate = dayjs(transaction.date);
    return (
      transaction.type === 'expense' &&
      transactionDate.isAfter(dayjs(dateRange.from).startOf('day')) && 
      transactionDate.isBefore(dayjs(dateRange.to).endOf('day'))
    );
  });

  const handleOpenChange = (open: boolean) => {
    if (!open && isDialogOpen) {
      setLocation("/");
    }
    setIsDialogOpen(open);
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="p-4 mb-4">
        <h1 className="text-2xl font-bold mb-4">Expense Report</h1>
        <div className="flex items-center gap-4">
          <DateRangePicker
            date={dateRange}
            onDateChange={setDateRange}
            className="w-full"
          />
          <Button 
            onClick={() => setDateRange({ from: undefined, to: undefined })}
            variant="outline"
          >
            Reset Range
          </Button>
        </div>
      </Card>

      {isDialogOpen && (
        <ExpenseReportDialog
          isOpen={isDialogOpen}
          onOpenChange={handleOpenChange}
          expenses={filteredTransactions}
          dateRange={dateRange}
        />
      )}
    </div>
  );
}