import { useState, useEffect } from 'react';
import IncomeReportDialog from "@/components/IncomeReportDialog";
import { useLocation } from "wouter";
import { Income } from "@/types";

export default function IncomeReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [, setLocation] = useLocation();
  const [incomes, setIncomes] = useState<Income[]>([]);

  // Sync with localStorage using useEffect
  useEffect(() => {
    const storedIncomes = localStorage.getItem("incomes");
    setIncomes(storedIncomes ? JSON.parse(storedIncomes) : []);
  }, []); // Empty dependency array means this runs once on mount

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