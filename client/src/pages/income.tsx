import { useState } from 'react';
import IncomeReportDialog from "@/components/IncomeReportDialog";
import { useLocation } from "wouter";

export default function IncomeReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [, setLocation] = useLocation();

  // Get incomes data from local storage with safe parsing
  const storedIncomes = localStorage.getItem("incomes");
  const incomes = storedIncomes ? JSON.parse(storedIncomes) : [];

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Ensure we navigate back only when dialog is explicitly closed
      setLocation("/");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Income Report</h1>
      {isDialogOpen && (
        <IncomeReportDialog
          isOpen={isDialogOpen}
          onOpenChange={handleOpenChange}
          incomes={incomes}
        />
      )}
    </div>
  );
}