import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import Calendar from "@/components/ui/calendar"; // Ensure Calendar is correctly imported
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Types and Utils
import { DateRange } from "react-day-picker";
import { Income } from "@/types";
import { formatCurrency, getCurrentDate } from '@/lib/utils';

// Initialize dayjs plugins
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

interface Transaction {
  id: number;
  description: string;
  amount: number;
  date: string;
  occurred: boolean;
}

interface IncomeReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  incomes: Income[];
  transactions: Transaction[];
}

export default function IncomeReportDialog({ isOpen, onOpenChange, incomes, expenses, transactions }: IncomeReportDialogProps) {
  const today = useMemo(() => getCurrentDate(), []); 
  const [date, setDate] = useState<DateRange | undefined>({
    from: today.toDate(),
    to: undefined
  });
  const [showReport, setShowReport] = useState(false);

  // Memoized transactions for performance optimization
  const memoizedTransactions = useMemo(() => transactions ?? [], [transactions]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Select Date Range</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="border rounded-lg p-4 bg-background">
            <Calendar
              transactions={memoizedTransactions} // Ensure transactions are passed correctly
              mode="range"
              selected={date}
              onSelect={setDate}
              numberOfMonths={1}
              defaultMonth={today.toDate()}
              className="rounded-md"
            />
          </div>
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setDate(undefined); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={() => setShowReport(true)} disabled={!date?.from || !date?.to}>Generate Report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
