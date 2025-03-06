import React, { useState } from "react";
import { useLocation } from "wouter";
import dayjs from "dayjs";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import IncomeReportDialog from "@/components/IncomeReportDialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Income } from "@/types";

// Define DateRange type
type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

export default function IncomeReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [, setLocation] = useLocation();
  const { incomes } = useData();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  const handleDateChange = (range: DateRange) => {
    setDateRange(range);
  };

  const filteredIncomes = incomes.filter((income) => {
    if (!dateRange.from || !dateRange.to) return true;
    const incomeDate = dayjs(income.date);
    return (
      incomeDate.isAfter(dayjs(dateRange.from)) &&
      incomeDate.isBefore(dayjs(dateRange.to))
    );
  });

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setLocation("/");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Income Report</h1>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Back to Dashboard
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <DateRangePicker
            date={dateRange}
            onDateChange={(range: DateRange | undefined) => {
              if (range) handleDateChange(range);
            }}
            className="w-full"
          />
          <Button
            onClick={() => setIsDialogOpen(true)}
            disabled={!dateRange.from || !dateRange.to}
          >
            Generate Report
          </Button>
        </div>

        {filteredIncomes.length === 0 && dateRange.from && dateRange.to && (
          <p className="text-center text-muted-foreground">
            No income records found for the selected date range.
          </p>
        )}
      </Card>

      {isDialogOpen && (
        <IncomeReportDialog
          isOpen={true}
          onOpenChange={handleOpenChange}
          incomes={filteredIncomes}
          dateRange={dateRange}
        />
      )}
    </div>
  );
}