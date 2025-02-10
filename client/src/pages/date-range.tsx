import { useState } from 'react';
import DateRangeReportDialog from "@/components/DateRangeReportDialog";

export default function DateRangeReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Date Range Report</h1>
      <DateRangeReportDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}