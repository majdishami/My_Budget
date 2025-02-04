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
import { Download, Calendar as CalendarIcon } from "lucide-react";
import { Income, Bill } from "@/types";
import dayjs from "dayjs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ExportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  incomes: Income[];
  bills: Bill[];
}

export function ExportDialog({ isOpen, onOpenChange, incomes, bills }: ExportDialogProps) {
  const [exportFormat, setExportFormat] = React.useState<"excel" | "csv" | "pdf">("excel");
  const [filename, setFilename] = React.useState("budget-export");
  const [startDate, setStartDate] = React.useState<Date | undefined>(dayjs().startOf('month').toDate());
  const [endDate, setEndDate] = React.useState<Date | undefined>(dayjs().endOf('month').toDate());

  const handleExport = () => {
    if (!startDate || !endDate) return;

    // Transform incomes and bills into a unified transaction format
    const transactions = [
      // Handle regular monthly incomes
      ...incomes
        .filter(income => income.source !== "Ruba's Salary")
        .map(income => ({
          id: income.id,
          amount: income.amount,
          description: income.source,
          category: 'Income',
          date: income.date,
          type: 'income' as const
        })),
      // Handle Ruba's bi-weekly salary separately
      ...incomes
        .filter(income => income.source === "Ruba's Salary")
        .map(income => ({
          id: income.id,
          amount: income.amount,
          description: income.source,
          category: 'Income',
          date: income.date,
          type: 'income' as const
        })),
      // Handle bills with monthly occurrences
      ...bills.flatMap(bill => {
        const startMonth = dayjs(startDate);
        const endMonth = dayjs(endDate);
        const occurrences = [];

        let currentMonth = startMonth.startOf('month');
        while (currentMonth.isBefore(endMonth) || currentMonth.isSame(endMonth, 'month')) {
          const billDate = currentMonth.date(bill.day);

          if ((billDate.isAfter(startMonth) || billDate.isSame(startMonth, 'day')) &&
              (billDate.isBefore(endMonth) || billDate.isSame(endMonth, 'day'))) {
            occurrences.push({
              id: `${bill.id}-${billDate.format('YYYY-MM')}`,
              amount: bill.amount,
              description: bill.name,
              category: 'Expense',
              date: billDate.toISOString(),
              type: 'expense' as const
            });
          }
          currentMonth = currentMonth.add(1, 'month');
        }
        return occurrences;
      })
    ];

    exportData(transactions, exportFormat, filename);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Choose your preferred format and date range for the export.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="format" className="text-right">
              Format
            </Label>
            <Select
              value={exportFormat}
              onValueChange={(value: "excel" | "csv" | "pdf") => setExportFormat(value)}
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Start Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? (
                    format(startDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => setStartDate(date || undefined)}
                  disabled={(date) => endDate ? date > endDate : false}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              End Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? (
                    format(endDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => setEndDate(date || undefined)}
                  disabled={(date) => startDate ? date < startDate : false}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button 
            type="submit" 
            onClick={handleExport}
            disabled={!startDate || !endDate}
          >
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}