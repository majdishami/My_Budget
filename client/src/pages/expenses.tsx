import React from 'react';
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "../hooks/use-toast";
import { ExpenseReportDialog } from "@/components/ExpenseReportDialog";
import { formatCurrency } from "@/lib/utils";
import { Bill, Category } from "@/types";
import { useData } from "@/contexts/DataContext";
import { DateRange } from "react-day-picker";
import { DataTable } from "@/components/DataTable";
import { DateRangePicker } from "@/components/ui/date-range-picker";

export function ExpenseReport() {
  const { toast } = useToast();
  const { bills, categories } = useData();
  const [filteredBills, setFilteredBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });

  useEffect(() => {
    if (bills) {
      setLoading(false);
      filterBills();
    }
  }, [bills, dateRange]);

  const filterBills = () => {
    if (!bills) return;

    let filtered = [...bills];

    // Filter by date range if available
    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter(bill => {
        const billDate = new Date(bill.date);
        return billDate >= dateRange.from && billDate <= dateRange.to;
      });
    }

    setFilteredBills(filtered);
  };

  const handleDateChange = (range: DateRange) => {
    setDateRange(range);
  };

  const handleGenerateReport = () => {
    setReportDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold">Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalExpenses = filteredBills.reduce(
    (sum, bill) => sum + bill.amount,
    0
  );

  return (
    <div className="container mx-auto py-10">
      <Card className="mb-8">
        <CardHeader className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
          <CardTitle className="text-xl font-bold">Expenses</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleGenerateReport}
              className="w-full md:w-auto"
              variant="outline"
            >
              Generate Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:items-end md:space-x-4 md:space-y-0">
            <div className="grid gap-2 md:w-1/3">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Date Range
              </label>
              <DateRangePicker
                date={dateRange}
                onDateChange={handleDateChange}
                className="w-full"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium">Total Expenses:</span>
              <span className="text-2xl font-bold">
                {formatCurrency(totalExpenses)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Expense Details</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredBills}
            columns={[
              {
                accessorKey: "description",
                header: "Description",
              },
              {
                accessorKey: "amount",
                header: "Amount",
                cell: ({ row }: any) => formatCurrency(row.original.amount),
              },
              {
                accessorKey: "category_id",
                header: "Category",
                cell: ({ row }: any) => {
                  const category = categories.find(
                    (cat) => cat.id === row.original.category_id
                  );
                  return category ? category.name : "Uncategorized";
                },
              },
              {
                accessorKey: "date",
                header: "Date",
                cell: ({ row }: any) => {
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
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        bills={filteredBills}
        categories={categories}
      />
    </div>
  );
}

export default ExpenseReport;