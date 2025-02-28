import { useState } from 'react';
import IncomeReportDialog from "@/components/IncomeReportDialog";
import { useLocation } from "wouter";
import { Income } from "@/types";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import dayjs from "dayjs";
import { useData } from "@/contexts/DataContext";

export default function IncomeReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [, setLocation] = useLocation();
  const { incomes } = useData();
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });

  const filteredIncomes = incomes.filter(income => {
    if (!dateRange.from || !dateRange.to) return true;
    const incomeDate = dayjs(income.date);
    return incomeDate.isAfter(dayjs(dateRange.from).startOf('day')) && 
           incomeDate.isBefore(dayjs(dateRange.to).endOf('day'));
  });

  const handleOpenChange = (open: boolean) => {
    // Only navigate if we're actually closing the dialog from an open state
    if (!open && isDialogOpen) {
      setLocation("/");
    }
    setIsDialogOpen(open);
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="p-4 mb-4">
        <h1 className="text-2xl font-bold mb-4">Income Report</h1>
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
        <IncomeReportDialog
          isOpen={isDialogOpen}
          onOpenChange={handleOpenChange}
          incomes={filteredIncomes}
          dateRange={dateRange}
        />
      )}
    </div>
  );
}