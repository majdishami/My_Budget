import { useState } from 'react';
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

export default function ExpenseReportPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { categories, expenses: allExpenses = [], isLoading: dataLoading, error } = useData();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [filter, setFilter] = useState<string>("all-expenses");

  const { data: expenses = [], isLoading: apiLoading } = useQuery({
    queryKey: ['/api/reports/expenses', dateRange?.from, dateRange?.to, filter],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];

      const params = new URLSearchParams();
      params.append('start_date', dayjs(dateRange.from).format('YYYY-MM-DD'));
      params.append('end_date', dayjs(dateRange.to).format('YYYY-MM-DD'));
      params.append('filter', filter);

      const response = await fetch(`/api/reports/expenses?${params}`);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      return response.json();
    },
    enabled: Boolean(dateRange?.from && dateRange?.to)
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

  const getFilterOptions = () => {
    const options = [
      { value: 'all-expenses', label: '✓ All Expenses' },
      { value: 'all-categories', label: 'All Categories' }
    ];

    // Add individual category options
    if (categories?.length > 0) {
      categories.forEach(category => {
        options.push({
          value: `category-${category.id}`,
          label: `Category: ${category.name}`
        });
      });
    }

    // Add individual expense options
    if (allExpenses?.length > 0) {
      allExpenses.forEach(expense => {
        options.push({
          value: `expense-${expense.id}`,
          label: `${expense.description} (${formatCurrency(expense.amount)})`
        });
      });
    }

    return options;
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
            value={filter}
            onValueChange={setFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select filter type" />
            </SelectTrigger>
            <SelectContent>
              {getFilterOptions().map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ReportFilter
            onDateRangeChange={(range) => {
              setDateRange(range || undefined);
            }}
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
          expenses={expenses}
          dateRange={dateRange}
        />
      )}
    </div>
  );
}