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

export default function ExpenseReportPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { categories = [], isLoading: dataLoading, error } = useData();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedType, setSelectedType] = useState<string>("all");

  const { data: expenses = [], isLoading: apiLoading } = useQuery({
    queryKey: ['/api/reports/expenses', dateRange?.from, dateRange?.to, selectedType],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];
      const params = new URLSearchParams({
        start_date: dayjs(dateRange.from).format('YYYY-MM-DD'),
        end_date: dayjs(dateRange.to).format('YYYY-MM-DD'),
        type: selectedType
      });
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
          <div className="flex items-center gap-4">
            <Select 
              value={selectedType} 
              onValueChange={setSelectedType}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Expenses</SelectItem>
                <SelectItem value="recurring">Recurring Only</SelectItem>
                <SelectItem value="one-time">One-time Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
          expenses={expenses}
          dateRange={dateRange}
        />
      )}
    </div>
  );
}