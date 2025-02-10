import { useState } from 'react';
import AnnualReportDialog from "@/components/AnnualReportDialog";
import { useLocation } from "wouter";

export default function AnnualReport() {
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
      <h1 className="text-2xl font-bold mb-4">Annual Report</h1>
      <AnnualReportDialog
        isOpen={isDialogOpen}
        onOpenChange={handleOpenChange}
      />
    </div>
  );
}