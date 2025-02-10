import { useState } from 'react';
import ExpenseReportDialog from "@/components/ExpenseReportDialog";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Bill } from "@/components/ExpenseReportDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExpenseReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [, setLocation] = useLocation();

  // Get bills data and categories from the API
  const { data: bills = [], isLoading, error } = useQuery<Bill[]>({
    queryKey: ['/api/bills'],
  });

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setLocation("/");
    }
  };

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

  // Log bills data for debugging
  console.log('Bills data:', bills);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Expense Report</h1>
      <ExpenseReportDialog
        isOpen={isDialogOpen}
        onOpenChange={handleOpenChange}
        bills={bills}
      />
    </div>
  );
}