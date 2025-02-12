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
import { formatCurrency } from '@/lib/utils';

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
  const today = useMemo(() => dayjs('2025-02-10'), []); // Fixed current date
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

    const generateTransactions = () => {
      const mockTransactions: Transaction[] = [];

      // Helper function to check if a date has occurred
      const hasDateOccurred = (checkDate: dayjs.Dayjs) => {
        return checkDate.isBefore(today) || checkDate.isSame(today, 'day');
      };

      incomes.forEach(income => {
        const incomeDate = dayjs(income.date);

        if (income.source === "Ruba's Salary") {
          // Start from January 10, 2025, for bi-weekly payments
          let payDate = dayjs('2025-01-10');

          // Find the first payment date within or before the range
          while (payDate.isBefore(startDate)) {
            payDate = payDate.add(14, 'day');
          }

          // Generate bi-weekly payments within the date range
          while (payDate.isSameOrBefore(endDate)) {
            if (payDate.day() === 5) { // Only on Fridays
              mockTransactions.push({
                date: payDate.format('YYYY-MM-DD'),
                description: income.source,
                amount: income.amount,
                occurred: hasDateOccurred(payDate)
              });
            }
            payDate = payDate.add(14, 'day');
          }
        } else {
          // For Majdi's salary and other regular incomes
          // Calculate the actual date for the current month
          const currentMonthDate = dayjs(income.date)
            .year(startDate.year())
            .month(startDate.month());

          // Generate entries for each month in the range
          let currentDate = currentMonthDate;
          while (currentDate.isSameOrBefore(endDate)) {
            if (currentDate.isBetween(startDate, endDate, 'day', '[]')) {
              mockTransactions.push({
                date: currentDate.format('YYYY-MM-DD'),
                description: income.source,
                amount: income.amount,
                occurred: hasDateOccurred(currentDate)
              });
            }
            // Move to next month with same day
            currentDate = currentDate.add(1, 'month');
          }
        }
      });

      return mockTransactions.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
    };

    const newTransactions = generateTransactions();

    // Calculate summary totals
    const totals = newTransactions.reduce(
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

    setTransactions(newTransactions);
    setSummaryTotals(totals);
  }, [showReport, date?.from, date?.to, incomes, today]);

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
              <div className="text-2xl font-bold text-green-200">{formatCurrency(summaryTotals.pending)}</div>
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
              {transactions.map((transaction, index) => (
                <TableRow key={`${transaction.date}-${index}`}>
                  <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                  <TableCell className={transaction.occurred ? 'text-green-600' : 'text-green-200'}>
                    {transaction.description}
                  </TableCell>
                  <TableCell className={`text-right ${transaction.occurred ? 'text-green-600' : 'text-green-200'}`}>
                    {formatCurrency(transaction.amount)}</TableCell>
                  <TableCell className={transaction.occurred ? 'text-green-600' : 'text-green-200'}>
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