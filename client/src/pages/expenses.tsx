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
import { Calendar } from "lucide-react";

type ReportType = 'all' | 'monthly' | 'annual' | 'custom' | 'category' | 'individual';
type CategoryFilter = 'all' | string;

export default function ExpenseReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { bills, categories, isLoading } = useData();
  const [reportType, setReportType] = useState<ReportType>('all');
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('M'));
  const [selectedYear, setSelectedYear] = useState(dayjs().format('YYYY'));
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
    return (bills || []).filter(bill => {
      const billDate = dayjs(bill.date);
      let dateMatches = true;

      // Apply date filters based on report type
      if (reportType === 'monthly') {
        const startOfMonth = dayjs(`${selectedYear}-${selectedMonth}-01`).startOf('month');
        const endOfMonth = startOfMonth.endOf('month');
        dateMatches = billDate.isSameOrAfter(startOfMonth) && billDate.isSameOrBefore(endOfMonth);
      } else if (reportType === 'annual') {
        const startOfYear = dayjs(selectedYear).startOf('year');
        const endOfYear = dayjs(selectedYear).endOf('year');
        dateMatches = billDate.isSameOrAfter(startOfYear) && billDate.isSameOrBefore(endOfYear);
      } else if (reportType === 'custom' && dateRange.from && dateRange.to) {
        dateMatches = billDate.isSameOrAfter(dayjs(dateRange.from).startOf('day')) && 
                     billDate.isSameOrBefore(dayjs(dateRange.to).endOf('day'));
      }

      // Apply category filter if selected
      const categoryMatches = selectedCategory === 'all' || bill.category_id === Number(selectedCategory);

      // Apply individual expense filter if selected
      const expenseMatches = selectedExpense === 'all' || bill.id === Number(selectedExpense);

      return dateMatches && categoryMatches && expenseMatches;
    });
  }, [bills, reportType, selectedMonth, selectedYear, dateRange, selectedCategory, selectedExpense]);

  const handleShowReport = () => {
    setIsDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setLocation("/");
    }
    setIsDialogOpen(open);
  };

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: dayjs().month(i).format('MMMM')
  })), []);

  const currentYear = dayjs().year();
  const years = useMemo(() => Array.from({ length: 11 }, (_, i) => ({
    value: (currentYear - 5 + i).toString(),
    label: (currentYear - 5 + i).toString()
  })), [currentYear]);

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
        <h1 className="text-2xl font-bold mb-4">Expense Report</h1>
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
                <SelectItem value="monthly">Monthly Report</SelectItem>
                <SelectItem value="annual">Annual Report</SelectItem>
                <SelectItem value="custom">Custom Date Range</SelectItem>
                <SelectItem value="category">By Category</SelectItem>
                <SelectItem value="individual">Individual Expense</SelectItem>
              </SelectContent>
            </Select>

            {reportType === 'monthly' && (
              <>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(month => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {reportType === 'annual' && (
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

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

          {(reportType === 'custom' || reportType === 'all') && (
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
          )}

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
        />
      )}
    </div>
  );
}