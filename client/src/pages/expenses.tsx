import { useState } from 'react';
import ExpenseReportDialog from "@/components/ExpenseReportDialog";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function ExpenseReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [, setLocation] = useLocation();

  // Get bills data and categories from the API
  const { data: bills = [] } = useQuery({
    queryKey: ['/api/bills'],
  });

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setLocation("/");
    }
  };

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