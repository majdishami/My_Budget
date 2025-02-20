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
import { cn } from "@/lib/utils";

export default function ExpenseReportPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { categories = [], expenses = [], isLoading: dataLoading, error } = useData();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [filter, setFilter] = useState<string>("all-expenses");

  const { data: filteredExpenses = [], isLoading: apiLoading } = useQuery({
    queryKey: ['/api/reports/expenses', dateRange?.from, dateRange?.to, filter],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];

      try {
        const params = new URLSearchParams({
          from: dayjs(dateRange.from).format('YYYY-MM-DD'),
          to: dayjs(dateRange.to).format('YYYY-MM-DD'),
          filter
        });

        const response = await fetch(`/api/reports/expenses?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch expenses');
        return response.json();
      } catch (err) {
        logger.error('[ExpenseReport] Error fetching expenses:', err);
        return [];
      }
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

  const filterOptions = [
    {
      label: "General",
      options: [
        {
          value: 'all-expenses',
          label: '📊 All Expenses',
          className: 'text-blue-600 font-medium'
        },
        {
          value: 'all-categories',
          label: '📁 All Categories',
          className: 'text-purple-600 font-medium'
        }
      ]
    },
    {
      label: "Categories",
      options: categories.map(category => ({
        value: `category-${category.id}`,
        label: `📂 ${category.name}`,
        className: 'text-purple-500 pl-4'
      }))
    },
    {
      label: "Individual Expenses",
      options: expenses.map(expense => ({
        value: `expense-${expense.id}`,
        label: `${expense.description} (${formatCurrency(expense.amount)})`,
        className: cn(
          'pl-4',
          expense.amount > 0 ? 'text-green-500' : 'text-red-500'
        )
      }))
    }
  ];

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
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select filter type" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map((group) => (
                <div key={group.label} className="py-2">
                  <div className="px-2 text-sm font-medium text-muted-foreground mb-1">
                    {group.label}
                  </div>
                  {group.options.map(option => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className={cn("cursor-pointer", option.className)}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                  {group.options.length > 0 && <div className="h-px bg-gray-200 my-2" />}
                </div>
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
          expenses={filteredExpenses}
          dateRange={dateRange}
        />
      )}
    </div>
  );
}