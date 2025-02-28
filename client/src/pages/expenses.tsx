
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "../hooks/use-toast"; // Fixed import path
import { ExpenseReportDialog } from "@/components/ExpenseReportDialog";
import { formatCurrency } from "@/lib/utils";
import { Bill } from "@/types";
import { useData } from "@/contexts/DataContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { addDays, startOfMonth, endOfMonth } from "date-fns";
import { saveAs } from 'file-saver';

export default function ExpenseReport() {
  const { bills, categories, isLoading } = useData();
  const { toast } = useToast();
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  const handleFilterChange = (value: string) => {
    setSelectedCategory(value);
  };

  const handleDateChange = (range: { from: Date | undefined, to: Date | undefined }) => {
    if (range.from && range.to) {
      setDateRange(range as { from: Date, to: Date });
    }
  };

  const filteredBills = bills.filter((bill) => {
    const isInCategory = selectedCategory === "all" || 
      bill.category_id === Number(selectedCategory);
    
    if (!dateRange.from || !dateRange.to) return isInCategory;
    
    const billDate = new Date(bill.date || '');
    return isInCategory && 
      billDate >= dateRange.from && 
      billDate <= dateRange.to;
  });

  const totalAmount = filteredBills.reduce(
    (acc, bill) => acc + bill.amount,
    0
  );

  const handleExportCSV = () => {
    try {
      const headers = ["Name", "Amount", "Category", "Date"];
      
      const csvData = filteredBills.map(bill => {
        const category = categories.find(cat => cat.id === bill.category_id);
        return [
          bill.name,
          bill.amount.toString(),
          category ? category.name : "No Category",
          bill.date || "No Date"
        ];
      });
      
      // Add headers to CSV
      csvData.unshift(headers);
      
      // Convert to CSV string
      const csvString = csvData.map(row => row.join(',')).join('\n');
      
      // Create a Blob and download
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, `expenses-report-${new Date().toISOString().split('T')[0]}.csv`);
      
      toast({
        title: "Export successful",
        description: "Your expense report has been exported as CSV",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "There was a problem exporting your expense report",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="container py-10 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold">Expense Report</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <Button
            onClick={() => setIsReportDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            Generate Report
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="w-full sm:w-auto"
          >
            Export as CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Category
              </label>
              <Select
                value={selectedCategory}
                onValueChange={handleFilterChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Date Range
              </label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={handleDateChange}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Expenses</CardTitle>
          <div className="text-xl font-bold">
            {formatCurrency(totalAmount)}
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredBills}
            columns={[
              {
                accessorKey: "name",
                header: "Name",
              },
              {
                accessorKey: "amount",
                header: "Amount",
                cell: ({ row }) => formatCurrency(row.original.amount),
              },
              {
                accessorKey: "category_id",
                header: "Category",
                cell: ({ row }) => {
                  const category = categories.find(
                    (cat) => cat.id === row.original.category_id
                  );
                  return category ? category.name : "No Category";
                },
              },
              {
                accessorKey: "date",
                header: "Date",
                cell: ({ row }) => {
                  return row.original.date
                    ? new Date(row.original.date).toLocaleDateString()
                    : "No Date";
                },
              },
            ]}
          />
        </CardContent>
      </Card>

      <ExpenseReportDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        bills={filteredBills}
        categories={categories}
        dateRange={dateRange}
      />
    </div>
  );
}
