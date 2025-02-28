import React, { useState, useEffect } from 'react';
import { useLocation } from "wouter";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ExpenseReportDialog } from "@/components/ExpenseReportDialog";
import { formatCurrency } from "@/lib/utils";
import { Bill } from "@/types";
import { useData } from "@/contexts/DataContext";

export default function ExpenseReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { bills, categories, isLoading, error } = useData();
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load expenses. Please try again.",
        variant: "destructive",
      });
    }
  }, [error]);

  const handleGenerateReport = () => {
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
  };

  const handleBackToReports = () => {
    setLocation("/reports");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Expense Report</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleBackToReports}>
                Back to Reports
              </Button>
              <Button onClick={handleGenerateReport}>Generate Report</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div>
            <h3 className="text-lg font-semibold mb-2">Summary</h3>
            <p>Total Expenses: {formatCurrency(bills.reduce((sum, bill) => sum + bill.amount, 0))}</p>
            <p>Number of Expenses: {bills.length}</p>
          </div>
        </CardContent>
      </Card>

      <ExpenseReportDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onClose={handleClose}
        bills={bills}
        categories={categories}
      />
    </div>
  );
}