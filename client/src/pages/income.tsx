import { useState, useEffect } from 'react';
import IncomeReportDialog from "@/components/IncomeReportDialog";
import { useLocation } from "wouter";
import { Income } from "@/types";
import { logger } from "@/lib/logger";

export default function IncomeReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [, setLocation] = useLocation();
  const [incomes, setIncomes] = useState<Income[]>([]);

  // Sync with localStorage using useEffect
  useEffect(() => {
    try {
      const storedIncomes = localStorage.getItem("incomes");
      if (!storedIncomes) {
        setIncomes([]);
        return;
      }

      const parsedIncomes = JSON.parse(storedIncomes);

      // Validate the parsed data is an array
      if (!Array.isArray(parsedIncomes)) {
        logger.error("Stored incomes is not an array");
        setIncomes([]);
        return;
      }

      // Validate each income object has required properties
      const validIncomes = parsedIncomes.filter((income): income is Income => {
        return (
          typeof income === 'object' &&
          income !== null &&
          typeof income.id === 'string' &&
          typeof income.source === 'string' &&
          typeof income.amount === 'number' &&
          typeof income.date === 'string'
        );
      });

      setIncomes(validIncomes);
    } catch (error) {
      logger.error("Error parsing stored incomes:", error);
      setIncomes([]);
    }
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