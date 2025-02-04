import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportData } from "@/lib/exports";
import { Download } from "lucide-react";
import { Income, Bill } from "@/types";
import dayjs from "dayjs";

interface ExportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  incomes: Income[];
  bills: Bill[];
}

export function ExportDialog({ isOpen, onOpenChange, incomes, bills }: ExportDialogProps) {
  const [format, setFormat] = React.useState<"excel" | "csv" | "pdf">("excel");
  const [filename, setFilename] = React.useState("budget-export");

  const handleExport = () => {
    // Transform incomes and bills into a unified transaction format
    const transactions = [
      ...incomes.map(income => ({
        id: income.id,
        amount: income.amount,
        description: income.source,
        category: 'Income',
        date: income.date,
        type: 'income' as const
      })),
      ...bills.map(bill => ({
        id: bill.id,
        amount: bill.amount,
        description: bill.name,
        category: 'Expense',
        date: dayjs().date(bill.day).toISOString(),
        type: 'expense' as const
      }))
    ];

    exportData(transactions, format, filename);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Choose your preferred format and filename for the export.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="format" className="text-right">
              Format
            </Label>
            <Select
              value={format}
              onValueChange={(value: "excel" | "csv" | "pdf") => setFormat(value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="filename" className="text-right">
              Filename
            </Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleExport}>
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}