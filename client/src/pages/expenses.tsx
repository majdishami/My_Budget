import { useState, useMemo } from 'react';
import ExpenseReportDialog from "@/components/ExpenseReportDialog";
import { useLocation } from "wouter";
import { Bill } from "@/types";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import dayjs from "dayjs";
import { useData } from "@/contexts/DataContext";
import { logger } from "@/lib/logger";

type ReportType = 'all' | 'category' | 'individual';
type CategoryFilter = 'all' | string;

export default function ExpenseReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { bills, categories, isLoading } = useData();
  const [reportType, setReportType] = useState<ReportType>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [selectedExpense, setSelectedExpense] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });

  // Filter bills based on report type and selected filters
  const filteredExpenses = useMemo(() => {
    logger.info("[ExpenseReport] Filtering expenses:", {
      billsCount: bills?.length,
      reportType,
      dateRange,
      selectedCategory
    });

    return (bills || []).reduce((filtered, bill) => {
      const billDate = dayjs(bill.date);

      // Skip invalid dates
      if (!billDate.isValid()) {
        logger.warn("[ExpenseReport] Invalid bill date:", { bill });
        return filtered;
      }

      let dateMatches = true;


      // Apply category filter if selected
      const categoryMatches = selectedCategory === 'all' || 
                            bill.category_id === Number(selectedCategory);

      // Apply individual expense filter if selected
      const expenseMatches = selectedExpense === 'all' || 
                            bill.id === Number(selectedExpense);

      if (dateMatches && categoryMatches && expenseMatches) {
        filtered.push({
          id: bill.id,
          date: billDate.format('YYYY-MM-DD'),
          description: bill.name,
          amount: bill.amount,
          type: 'expense' as const,
          category_name: bill.category_name,
          category_color: bill.category_color,
          category_icon: bill.category_icon
        });
      }

      return filtered;
    }, [] as Array<{
      id: number;
      date: string;
      description: string;
      amount: number;
      type: 'expense';
      category_name?: string;
      category_color?: string;
      category_icon?: string | null;
    }>);
  }, [bills, reportType, selectedCategory, selectedExpense]);

  const handleShowReport = () => {
    setIsDialogOpen(true);
    logger.info("[ExpenseReport] Opening report dialog with expenses:", {
      expenseCount: filteredExpenses.length,
      dateRange,
      reportType
    });
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
            <Select value={reportType} onValueChange={(value: ReportType) => {
              setReportType(value);
              // Reset filters when changing report type
              if (value !== 'category') setSelectedCategory('all');
              if (value !== 'individual') setSelectedExpense('all');
            }}>
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

            {reportType === 'individual' && bills && bills.length > 0 && (
              <Select value={selectedExpense} onValueChange={setSelectedExpense}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select expense" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Expenses</SelectItem>
                  {bills.map(bill => (
                    <SelectItem key={bill.id} value={bill.id.toString()}>
                      {bill.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button onClick={handleShowReport} className="w-full">
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
          onBack={() => setIsDialogOpen(false)}
        />
      )}
    </div>
  );
}