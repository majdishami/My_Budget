import { useState, useEffect } from 'react';
import { useLocation } from "wouter";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReportFilter } from '@/components/ReportFilter';
import ExpenseReportDialog from "@/components/ExpenseReportDialog";
import { useData } from "@/contexts/DataContext";
import { logger } from "@/lib/logger";
import { DateRange } from "react-day-picker";
import { formatCurrency } from '@/lib/utils';

interface Expense {
  id: number;
  date: string;
  description: string;
  amount: number;
  category_id?: number;
}

export default function ExpenseReportPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { categories = [], expenses: allExpenses = [], isLoading: dataLoading, error } = useData();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedType, setSelectedType] = useState<string>("all-expenses");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();
  const [selectedExpenseId, setSelectedExpenseId] = useState<number | undefined>();

  const { data: expenses = [], isLoading: apiLoading } = useQuery({
    queryKey: ['/api/reports/expenses', {
      startDate: dateRange?.from ? dayjs(dateRange.from).format('YYYY-MM-DD') : undefined,
      endDate: dateRange?.to ? dayjs(dateRange.to).format('YYYY-MM-DD') : undefined,
      type: selectedType,
      categoryId: selectedCategoryId,
      expenseId: selectedExpenseId
    }],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];

      const params = new URLSearchParams();
      params.append('start_date', dayjs(dateRange.from).format('YYYY-MM-DD'));
      params.append('end_date', dayjs(dateRange.to).format('YYYY-MM-DD'));
      params.append('type', selectedType);

      if (selectedCategoryId) {
        params.append('category_id', selectedCategoryId.toString());
      }
      if (selectedExpenseId) {
        params.append('expense_id', selectedExpenseId.toString());
      }

      const response = await fetch(`/api/reports/expenses?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      return response.json();
    },
    enabled: Boolean(dateRange?.from && dateRange?.to)
  });

  // Reset secondary selections when type changes
  useEffect(() => {
    setSelectedCategoryId(undefined);
    setSelectedExpenseId(undefined);
  }, [selectedType]);

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
          <Select
            defaultValue="all-expenses"
            value={selectedType}
            onValueChange={setSelectedType}
          >
            <SelectTrigger>
              <SelectValue>All Expenses</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-expenses">✓ All Expenses</SelectItem>
              <SelectItem value="all-categories">All Categories</SelectItem>
              <SelectItem value="individual-categories">Individual Categories</SelectItem>
              <SelectItem value="individual-expenses">Individual Expenses</SelectItem>
            </SelectContent>
          </Select>

          {selectedType === 'individual-categories' && (
            <Select
              value={selectedCategoryId?.toString()}
              onValueChange={(value) => setSelectedCategoryId(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedType === 'individual-expenses' && (
            <Select
              value={selectedExpenseId?.toString()}
              onValueChange={(value) => setSelectedExpenseId(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an expense" />
              </SelectTrigger>
              <SelectContent>
                {allExpenses.map((expense) => (
                  <SelectItem key={expense.id} value={expense.id.toString()}>
                    {expense.description} ({formatCurrency(expense.amount)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <ReportFilter
            onDateRangeChange={(range) => {
              setDateRange(range || undefined);
            }}
            maxDateRange={90}
          />

          <Button
            onClick={handleShowReport}
            className="w-full"
            disabled={!dateRange?.from || !dateRange?.to ||
                     (selectedType === 'individual-categories' && !selectedCategoryId) ||
                     (selectedType === 'individual-expenses' && !selectedExpenseId)}
          >
            Generate Report
          </Button>
        </div>
      </Card>

      {isDialogOpen && dateRange?.from && dateRange?.to && (
        <ExpenseReportDialog
          isOpen={isDialogOpen}
          onOpenChange={handleOpenChange}
          expenses={expenses}
          dateRange={dateRange}
        />
      )}
    </div>
  );
}