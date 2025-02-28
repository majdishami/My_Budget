import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bill, Category } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ExpenseReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  bills: Bill[];
  categories: Category[];
}

export function ExpenseReportDialog({
  open,
  onOpenChange,
  onClose,
  bills,
  categories,
  isLoading = false,
}: ExpenseReportDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredExpenses = bills.filter(
    (expense) =>
      expense.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCategory(expense.category_id)?.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  function getCategory(categoryId: number | null) {
    return categories.find((cat) => cat.id === categoryId) || null;
  }

  function handleDownloadCSV() {
    const headers = ["Name", "Amount", "Category", "Due Date"];
    const rows = filteredExpenses.map((expense) => [
      expense.name,
      expense.amount.toString(),
      getCategory(expense.category_id)?.name || "Uncategorized",
      expense.day ? `Day ${expense.day}` : "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "expense_report.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Expense Report</DialogTitle>
          <DialogDescription>
            A summary of your recurring expenses
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 mb-2">
          <Input
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />

          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 font-medium">
                  <th className="py-2 px-4 text-left">Name</th>
                  <th className="py-2 px-4 text-left">Category</th>
                  <th className="py-2 px-4 text-left">Due</th>
                  <th className="py-2 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b">
                    <td className="py-2 px-4">{expense.name}</td>
                    <td className="py-2 px-4">
                      {getCategory(expense.category_id)?.name || "Uncategorized"}
                    </td>
                    <td className="py-2 px-4">
                      {expense.day ? `Day ${expense.day}` : "N/A"}
                    </td>
                    <td className="py-2 px-4 text-right">
                      {formatCurrency(expense.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="font-medium">
                  <td colSpan={3} className="py-2 px-4 text-right">
                    Total:
                  </td>
                  <td className="py-2 px-4 text-right">
                    {formatCurrency(totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleDownloadCSV}>Download CSV</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}