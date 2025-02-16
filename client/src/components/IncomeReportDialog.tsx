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
import { Calendar } from "@/components/ui/calendar";
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
  date: string;
  description: string;
  amount: number;
  occurred: boolean;
}

interface IncomeReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  incomes: Income[];
}

export default function IncomeReportDialog({ isOpen, onOpenChange, incomes }: IncomeReportDialogProps) {
  const today = useMemo(() => getCurrentDate(), []); 
  const [date, setDate] = useState<DateRange | undefined>({
    from: today.toDate(),
    to: undefined
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [summaryTotals, setSummaryTotals] = useState({
    occurred: 0,
    pending: 0
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setDate({
        from: today.toDate(),
        to: undefined
      });
      setShowReport(false);
      setTransactions([]);
      setSummaryTotals({ occurred: 0, pending: 0 });
    }
  }, [isOpen, today]);

  // Generate transactions when date range is selected
  useEffect(() => {
    if (!showReport || !date?.from || !date?.to) return;

    const startDate = dayjs(date.from);
    const endDate = dayjs(date.to);
    const generatedTransactions: Transaction[] = [];

    // Generate Majdi's salary transactions
    const majdiPayDates = Array.from({ length: 12 }, (_, i) => {
      const month = startDate.add(i, 'month');
      return [month.date(1), month.date(15)];
    }).flat();

    majdiPayDates.forEach(payDate => {
      if (payDate.isBetween(startDate, endDate, 'day', '[]')) {
        generatedTransactions.push({
          date: payDate.format('YYYY-MM-DD'),
          description: "Majdi's Salary",
          amount: 4739,
          occurred: payDate.isSameOrBefore(today)
        });
      }
    });

    // Generate Ruba's salary transactions
    let rubaPayDate = dayjs('2025-01-10');
    while (rubaPayDate.isSameOrBefore(endDate)) {
      if (rubaPayDate.isBetween(startDate, endDate, 'day', '[]')) {
        generatedTransactions.push({
          date: rubaPayDate.format('YYYY-MM-DD'),
          description: "Ruba's Salary",
          amount: 2168,
          occurred: rubaPayDate.isSameOrBefore(today)
        });
      }
      rubaPayDate = rubaPayDate.add(14, 'day');
    }

    setTransactions(generatedTransactions);
  }, [showReport, date?.from, date?.to, today]);

  // Filter transactions based on date range
  const filteredTransactions = useMemo(() => {
    if (!date?.from || !date?.to) return [];

    return transactions.filter(t => {
      const transactionDate = dayjs(t.date);
      return transactionDate.isSameOrAfter(dayjs(date.from)) && 
             transactionDate.isSameOrBefore(dayjs(date.to));
    });
  }, [transactions, date]);

  // Calculate summary totals
  const totals = filteredTransactions.reduce(
    (acc, transaction) => {
      if (transaction.occurred) {
        acc.occurred += transaction.amount;
      } else {
        acc.pending += transaction.amount;
      }
      return acc;
    },
    { occurred: 0, pending: 0 }
  );
  setSummaryTotals(totals);


  if (!showReport) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Select Date Range</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="border rounded-lg p-4 bg-background">
              <Calendar
                mode="range"
                selected={date}
                onSelect={setDate}
                numberOfMonths={1}
                defaultMonth={today.toDate()}
                className="rounded-md"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {date?.from ? (
                <>
                  {dayjs(date.from).format('MMM D, YYYY')}
                  {date.to ? ` - ${dayjs(date.to).format('MMM D, YYYY')}` : ''}
                </>
              ) : (
                'Select start and end dates'
              )}
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDate(undefined);
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => setShowReport(true)}
              disabled={!date?.from || !date?.to}
            >
              Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Income Report
            <div className="text-sm font-normal text-muted-foreground mt-1">
              {dayjs(date?.from).format('MMM D, YYYY')} - {dayjs(date?.to).format('MMM D, YYYY')}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Paid Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summaryTotals.occurred)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Pending Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-100">{formatCurrency(summaryTotals.pending)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction, index) => (
                <TableRow key={`${transaction.date}-${index}`}>
                  <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                  <TableCell className={transaction.occurred ? 'text-green-600' : 'text-green-100'}>
                    {transaction.description}
                  </TableCell>
                  <TableCell className={`text-right ${transaction.occurred ? 'text-green-600' : 'text-green-100'}`}>
                    {formatCurrency(transaction.amount)}</TableCell>
                  <TableCell className={transaction.occurred ? 'text-green-600' : 'text-green-100'}>
                    {transaction.occurred ? 'Paid' : 'Pending'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}