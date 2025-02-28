import React, { useState } from 'react';
import { useLocation } from "wouter";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import ExpenseReportDialog from "@/components/ExpenseReportDialog";
import { useData } from "@/contexts/DataContext";
import { Expense, Category } from "@/types";

// Define DateRange type
type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

export default function ExpenseReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { categories = [] } = useData();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });
  const [filter, setFilter] = useState<string>("all-expenses");

  // Fetch expenses data
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['/api/expenses'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/expenses');
        if (!response.ok) {
          throw new Error('Failed to fetch expenses');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching expenses:', error);
        return [];
      }
    }
  });

  // Filter expenses based on date range
  const filteredExpenses = React.useMemo(() => {
    if (!dateRange.from || !dateRange.to) {
      return expenses;
    }

    return expenses.filter((expense: Expense) => {
      const expenseDate = dayjs(expense.date);
      return (
        expenseDate.isAfter(dayjs(dateRange.from)) && 
        expenseDate.isBefore(dayjs(dateRange.to))
      );
    });
  }, [expenses, dateRange]);

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setLocation("/");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Expense Report</h1>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Back to Dashboard
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <DateRangePicker
            date={dateRange}
            onDateChange={setDateRange}
            className="w-full"
          />
          <Button 
            onClick={() => setIsDialogOpen(true)}
            disabled={!dateRange.from || !dateRange.to}
          >
            Generate Report
          </Button>
        </div>

        {filteredExpenses.length === 0 && dateRange.from && dateRange.to && (
          <p className="text-center text-muted-foreground">
            No expense records found for the selected date range.
          </p>
        )}
      </Card>

      {isDialogOpen && (
        <ExpenseReportDialog
          isOpen={true}
          onOpenChange={handleOpenChange}
          expenses={filteredExpenses}
          categories={categories}
          dateRange={dateRange}
        />
      )}
    </div>
  );
}