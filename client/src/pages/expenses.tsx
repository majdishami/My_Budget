import { useState } from 'react';
import ExpenseReportDialog from "@/components/ExpenseReportDialog";

export default function ExpenseReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Expense Report</h1>
      <ExpenseReportDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}