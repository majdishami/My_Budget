import { useState } from 'react';
import ExpenseReportDialog from "@/components/ExpenseReportDialog";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Bill, Category } from "@/types";
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
import { cn } from "@/lib/utils";

export default function ExpenseReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('M'));
  const [selectedYear, setSelectedYear] = useState(dayjs().format('YYYY'));
  const [, setLocation] = useLocation();

  // Query bills and categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: bills = [], isLoading: billsLoading, error: billsError } = useQuery<Bill[]>({
    queryKey: ['/api/bills'],
  });

  // Query transactions
  const { data: transactions = [], isLoading: transactionsLoading, error: transactionsError } = useQuery({
    queryKey: ['/api/transactions', { type: 'expense' }],
    enabled: !billsLoading && bills.length > 0,
  });

  const isLoading = billsLoading || transactionsLoading || categoriesLoading;
  const error = billsError || transactionsError;

  // Group bills by category with proper null handling
  const groupedBills = bills.reduce((acc: Record<string, Bill[]>, bill) => {
    const category = categories.find(c => c.id === bill.category_id);
    const categoryName = category?.name || 'Uncategorized';

    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(bill);
    return acc;
  }, {});

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
  const currentYear = dayjs().year();
  const years = Array.from({ length: 11 }, (_, i) => ({
    value: (currentYear - 5 + i).toString(),
    label: (currentYear - 5 + i).toString()
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
            Error loading expense data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentDate = dayjs();

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

      <div className="space-y-4">
        {Object.entries(groupedBills).map(([category, categoryBills]) => (
          <div key={category} className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-600 mb-2">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryBills.map(bill => {
                // Determine category-based color
                const categoryColor = 
                  bill.category_id === 1 ? "text-blue-600" :
                  bill.category_id === 2 ? "text-green-600" :
                  bill.category_id === 3 ? "text-purple-600" :
                  bill.category_id === 4 ? "text-red-600" :
                  bill.category_id === 5 ? "text-pink-600" :
                  bill.category_id === 6 ? "text-orange-600" :
                  bill.category_id === 7 ? "text-yellow-600" :
                  bill.category_id === 8 ? "text-lime-600" :
                  bill.category_id === 9 ? "text-cyan-600" :
                  bill.category_id === 10 ? "text-indigo-600" :
                  bill.category_id === 11 ? "text-violet-600" :
                  bill.category_id === 12 ? "text-amber-600" :
                  bill.category_id === 13 ? "text-emerald-600" :
                  "text-slate-600";

                return (
                  <div
                    key={bill.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      categoryColor
                    )}
                  >
                    <div className="font-medium">{bill.name}</div>
                    <div className="text-sm opacity-80">
                      Due on day {bill.due_date}
                    </div>
                    <div className="mt-1 font-bold">
                      ${bill.amount.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <ExpenseReportDialog
        isOpen={isDialogOpen}
        onOpenChange={handleOpenChange}
        bills={bills}
        transactions={transactions}
      />
    </div>
  );
}