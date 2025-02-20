import { useState } from 'react';
import { useLocation } from "wouter";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const ExpenseReport = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { bills = [], categories = [], isLoading: dataLoading, error } = useData();
  const [reportType, setReportType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedExpense, setSelectedExpense] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Handle error state from DataContext
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

  const uniqueExpenses = bills.filter((bill, index, self) =>
    index === self.findIndex((b) => b.name === bill.name && b.amount === bill.amount)
  );

  // API query enabled only when date range is selected
  const { data: expenses = [], isLoading: apiLoading } = useQuery<Expense[]>({
    queryKey: ['/api/reports/expenses', {
      startDate: dateRange?.from ? dayjs(dateRange.from).format('YYYY-MM-DD') : null,
      endDate: dateRange?.to ? dayjs(dateRange.to).format('YYYY-MM-DD') : null
    }],
    enabled: isDialogOpen && Boolean(dateRange?.from) && Boolean(dateRange?.to)
  });

  const isLoading = dataLoading || apiLoading;

  const filteredExpenses = expenses.map(expense => {
    const category = categories.find(c => c.id === expense.category_id);
    return {
      id: expense.id,
      date: expense.date,
      description: expense.description,
      amount: expense.amount,
      type: 'expense' as const,
      category_name: category?.name,
      category_color: category?.color,
      category_icon: category?.icon || undefined
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
    if (!open) {
      setLocation("/");
    }
    setIsDialogOpen(open);
  };

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
};

export default ExpenseReport;