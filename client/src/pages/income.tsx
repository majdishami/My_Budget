import { useState } from 'react';
import IncomeReportDialog from "@/components/IncomeReportDialog";

export default function IncomeReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Income Report</h1>
      <IncomeReportDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}