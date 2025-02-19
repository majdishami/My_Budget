import { useState } from 'react';
import DateRangeReportDialog from "@/components/DateRangeReportDialog";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";

export default function DateRangeReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [, setLocation] = useLocation();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Ensure we cleanup and navigate away properly
      setIsDialogOpen(false);
      setLocation("/");
    }
  };

  return (
    <div className="container mx-auto p-4 h-full">
      <Card className="p-4">
        <h1 className="text-2xl font-bold mb-4">Date Range Report</h1>
        <DateRangeReportDialog
          isOpen={isDialogOpen}
          onOpenChange={handleOpenChange}
        />
      </Card>
    </div>
  );
}