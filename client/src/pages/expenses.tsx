import { useState } from 'react';
import ExpenseReportDialog from "@/components/ExpenseReportDialog";
import { useLocation } from "wouter";
import { Bill } from "@/types";
import { ReportFilter } from "@/components/ReportFilter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import dayjs from "dayjs";
import { useData } from "@/contexts/DataContext";
import { logger } from "@/lib/logger";
import { useQuery } from "@tanstack/react-query";

type ReportType = 'all' | 'category' | 'individual';
type CategoryFilter = 'all' | string;

export default function ExpenseReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { bills, categories, isLoading } = useData();
  const [reportType, setReportType] = useState<ReportType>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [selectedExpense, setSelectedExpense] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const uniqueExpenses = bills?.filter((bill, index, self) =>
    index === self.findIndex((b) => b.name === bill.name && b.amount === bill.amount)
  ) ?? [];

  const formattedStartDate = startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined;
  const formattedEndDate = endDate ? dayjs(endDate).format('YYYY-MM-DD') : undefined;

  const handleDateRangeChange = (range: { from: Date; to: Date }) => {
    setStartDate(range.from);
    setEndDate(range.to);
  };

  const { data: expenses = [], isLoading: apiIsLoading } = useQuery({
    queryKey: ['/api/reports/expenses', formattedStartDate, formattedEndDate],
    enabled: isDialogOpen && Boolean(formattedStartDate) && Boolean(formattedEndDate)
  });

  const filteredExpenses = expenses.filter(expense => {
    if (!expense || typeof expense !== 'object') {
      logger.error("[ExpenseReport] Invalid expense data:", { expense });
      return false;
    }

    const categoryMatches = selectedCategory === 'all' || 
                        expense.category_id === Number(selectedCategory);

    const expenseMatches = selectedExpense === 'all' || 
                        `${expense.name}-${expense.amount}` === selectedExpense;

    return categoryMatches && expenseMatches;
  });

  const handleShowReport = () => {
    if (!startDate || !endDate) {
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

  const handleBack = () => {
    setLocation("/");
  };

  if (isLoading || apiIsLoading) {
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
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Select 
              value={reportType} 
              onValueChange={(value: ReportType) => {
                setReportType(value);
                if (value !== 'category') setSelectedCategory('all');
                if (value !== 'individual') setSelectedExpense('all');
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Expenses</SelectItem>
                <SelectItem value="category">By Category</SelectItem>
                <SelectItem value="individual">Individual Expense</SelectItem>
              </SelectContent>
            </Select>

            {(reportType === 'category' || reportType === 'all') && categories && categories.length > 0 && (
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {reportType === 'individual' && uniqueExpenses.length > 0 && (
              <Select value={selectedExpense} onValueChange={setSelectedExpense}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select expense" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Expenses</SelectItem>
                  {uniqueExpenses.map(bill => (
                    <SelectItem 
                      key={`${bill.name}-${bill.amount}`} 
                      value={`${bill.name}-${bill.amount}`}
                    >
                      {bill.name} (${bill.amount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <ReportFilter
            onDateRangeChange={handleDateRangeChange}
            maxDateRange={90}
          />

          <Button 
            onClick={handleShowReport} 
            className="w-full"
            disabled={!startDate || !endDate}
          >
            Generate Report
          </Button>
        </div>
      </Card>

      {isDialogOpen && startDate && endDate && (
        <ExpenseReportDialog
          isOpen={isDialogOpen}
          onOpenChange={handleOpenChange}
          expenses={filteredExpenses}
          dateRange={{
            from: startDate,
            to: endDate
          }}
          onBack={() => setIsDialogOpen(false)}
        />
      )}
    </div>
  );
}