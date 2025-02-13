import { useState } from 'react';
import ExpenseReportDialog from "@/components/ExpenseReportDialog";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Bill } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dayjs from "dayjs";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getCurrentDate } from "@/lib/utils";

export default function ExpenseReport() {
  const currentDate = getCurrentDate();
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(currentDate.format('M'));
  const [selectedYear, setSelectedYear] = useState(currentDate.format('YYYY'));
  const [, setLocation] = useLocation();

  const { data: bills = [], isLoading, error } = useQuery<Bill[]>({
    queryKey: ['/api/bills'],
  });

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setLocation("/");
    }
  };

  // Generate month options
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: dayjs().month(i).format('MMMM')
  }));

  // Generate year options (current year ± 5 years)
  const year = currentDate.year();
  const years = Array.from({ length: 11 }, (_, i) => ({
    value: (year - 5 + i).toString(),
    label: (year - 5 + i).toString()
  }));

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Expense Report</h1>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Expense Report</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading bills data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-screen overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Expense Report</h1>
          <div className="text-sm text-muted-foreground mt-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {currentDate.format('dddd, MMMM D, YYYY')}
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-4 md:mt-0">
          <div className="w-32">
            <Select
              value={selectedMonth}
              onValueChange={setSelectedMonth}
            >
              <SelectTrigger>
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {months.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-24">
            <Select
              value={selectedYear}
              onValueChange={setSelectedYear}
            >
              <SelectTrigger>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {years.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <ErrorBoundary>
        <ExpenseReportDialog
          isOpen={isDialogOpen}
          onOpenChange={handleOpenChange}
          bills={bills.map(bill => ({
            ...bill,
            category_color: bill.category_color || '#808080' // Provide default color if missing
          }))}
        />
      </ErrorBoundary>
    </div>
  );
}