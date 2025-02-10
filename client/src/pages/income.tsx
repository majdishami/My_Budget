import { useState } from 'react';
import IncomeReportDialog from "@/components/IncomeReportDialog";
import { useLocation } from "wouter";

export default function IncomeReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [, setLocation] = useLocation();

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setLocation("/");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Income Report</h1>
      <IncomeReportDialog
        isOpen={isDialogOpen}
        onOpenChange={handleOpenChange}
      />
    </div>
  );
}