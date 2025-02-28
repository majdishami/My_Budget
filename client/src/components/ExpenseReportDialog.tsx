
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import React from 'react';
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Bill, Category } from "@/types";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export interface ExpenseReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bills: Bill[];
  categories: Category[];
}

export function ExpenseReportDialog({
  open,
  onOpenChange,
  bills,
  categories,
}: ExpenseReportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "excel">("pdf");

  const totalAmount = bills.reduce((total, bill) => total + bill.amount, 0);

  const getCategoryName = (categoryId: number): string => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : "Uncategorized";
  };

  const generatePdf = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text("Expense Report", 14, 22);
    
    // Add date
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Add total
    doc.setFontSize(12);
    doc.text(`Total Expenses: ${formatCurrency(totalAmount)}`, 14, 38);
    
    // Define the table structure
    const tableColumn = ["Date", "Description", "Category", "Amount"];
    const tableRows = bills.map((bill) => [
      new Date(bill.date).toLocaleDateString(),
      bill.description,
      getCategoryName(bill.category_id),
      formatCurrency(bill.amount),
    ]);
    
    // @ts-ignore - jsPDF-autotable types are not properly defined
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [66, 66, 66] },
    });
    
    // Save the PDF
    doc.save("expense-report.pdf");
  };

  const generateExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      bills.map((bill) => ({
        Date: new Date(bill.date).toLocaleDateString(),
        Description: bill.description,
        Category: getCategoryName(bill.category_id),
        Amount: bill.amount.toFixed(2),
      }))
    );
    
    // Format the header row
    XLSX.utils.sheet_add_aoa(worksheet, [["Date", "Description", "Category", "Amount"]], {
      origin: "A1",
    });
    
    // Create a workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    
    // Generate the Excel file
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    
    // Save the file
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    saveAs(data, "expense-report.xlsx");
  };

  const handleGenerateReport = () => {
    if (selectedFormat === "pdf") {
      generatePdf();
    } else {
      generateExcel();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Generate Expense Report</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <div className="font-medium">Report Format</div>
            <div className="flex space-x-4">
              <Button
                variant={selectedFormat === "pdf" ? "default" : "outline"}
                onClick={() => setSelectedFormat("pdf")}
              >
                PDF
              </Button>
              <Button
                variant={selectedFormat === "excel" ? "default" : "outline"}
                onClick={() => setSelectedFormat("excel")}
              >
                Excel
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <div className="font-medium">Report Summary</div>
            <div className="rounded-md border p-4">
              <div className="mb-2">
                <span className="font-medium">Total Expenses:</span>{" "}
                {formatCurrency(totalAmount)}
              </div>
              <div>
                <span className="font-medium">Number of Transactions:</span>{" "}
                {bills.length}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerateReport}>Generate Report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
