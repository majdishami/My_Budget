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

interface Expense {
  id: number;
  date: string;
  description: string;
  amount: number;
  category_id?: number;
}

interface DateRange {
  from: Date;
  to: Date;
}

export default function ExpenseReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { bills = [], categories = [], isLoading: dataLoading, error } = useData();
  const [reportType, setReportType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedExpense, setSelectedExpense] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date()
  });

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

  const formattedStartDate = dayjs(dateRange.from).format('YYYY-MM-DD');
  const formattedEndDate = dayjs(dateRange.to).format('YYYY-MM-DD');

  const { data: expenses = [], isLoading: apiLoading } = useQuery<Expense[]>({
    queryKey: ['/api/reports/expenses', formattedStartDate, formattedEndDate],
    enabled: isDialogOpen
  });

  const isLoading = dataLoading || apiLoading;

  const filteredExpenses = (expenses || []).map(expense => {
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
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Select 
              value={reportType} 
              onValueChange={(value) => {
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

            {(reportType === 'category' || reportType === 'all') && categories.length > 0 && (
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
            onDateRangeChange={setDateRange}
            maxDateRange={90}
          />

          <Button 
            onClick={handleShowReport} 
            className="w-full"
          >
            Generate Report
          </Button>
        </div>
      </Card>

      {isDialogOpen && (
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