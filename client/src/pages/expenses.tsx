import { useState } from 'react';
import { useLocation } from "wouter";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportFilter } from "@/components/ReportFilter";
import ExpenseReportDialog from "@/components/ExpenseReportDialog";
import { useData } from "@/contexts/DataContext";
import { logger } from "@/lib/logger";
import { DateRange } from "react-day-picker";

interface Expense {
  id: number;
  date: string;
  description: string;
  amount: number;
  category_id?: number;
}

function ExpenseReportPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { bills = [], categories = [], isLoading: dataLoading, error } = useData();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const { data: expenses = [], isLoading: apiLoading } = useQuery({
    queryKey: ['/api/reports/expenses', {
      startDate: dateRange?.from ? dayjs(dateRange.from).format('YYYY-MM-DD') : undefined,
      endDate: dateRange?.to ? dayjs(dateRange.to).format('YYYY-MM-DD') : undefined
    }],
    enabled: Boolean(dateRange?.from) && Boolean(dateRange?.to) //Only fetch when a date range is selected
  });

  const isLoading = dataLoading || apiLoading;

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="p-4">
          <div className="text-red-500">
            Error loading data: {error.message}
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </Card>
      </div>
    );
  }

  const filteredExpenses = expenses.map(expense => {
    const category = categories.find(c => c.id === expense.category_id);
    return {
      ...expense,
      type: 'expense' as const,
      category_name: category?.name,
      category_color: category?.color,
      category_icon: category?.icon
    };
  });

  const handleShowReport = () => {
    if (!dateRange?.from || !dateRange?.to) {
      logger.warn("[ExpenseReport] Attempted to show report without date range");
      return;
    }
    setIsDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Expense Report</h1>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Back
          </Button>
        </div>

        <div className="space-y-4">
          <ReportFilter
            onDateRangeChange={setDateRange}
            maxDateRange={90}
          />

          <Button 
            onClick={handleShowReport} 
            className="w-full"
            disabled={!dateRange?.from || !dateRange?.to}
          >
            Generate Report
          </Button>
        </div>
      </Card>

      {isDialogOpen && dateRange?.from && dateRange?.to && (
        <ExpenseReportDialog
          isOpen={isDialogOpen}
          onOpenChange={handleOpenChange}
          expenses={filteredExpenses}
          dateRange={dateRange}
        />
      )}
    </div>
  );
}

export default ExpenseReportPage;