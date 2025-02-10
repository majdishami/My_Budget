import { useState } from 'react';
import AnnualReportDialog from "@/components/AnnualReportDialog";

export default function AnnualReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Annual Report</h1>
      <AnnualReportDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}