import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

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
import { logger } from '@/lib/logger';

// Initialize dayjs plugins
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);

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
  totalMonthlyIncome: number;
  currentDate: dayjs.Dayjs;
}

export default function IncomeReportDialog({ 
  isOpen, 
  onOpenChange, 
  incomes,
  totalMonthlyIncome,
  currentDate
}: IncomeReportDialogProps) {
  const [date, setDate] = useState<DateRange | undefined>({
    from: currentDate.toDate(),
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
        from: currentDate.toDate(),
        to: undefined
      });
      setShowReport(false);
      setTransactions([]);
      setSummaryTotals({ occurred: 0, pending: 0 });
    }
  }, [isOpen, currentDate]);

  // Generate transactions when date range is selected
  useEffect(() => {
    if (!showReport || !date?.from || !date?.to) return;

    const startDate = dayjs(date.from);
    const endDate = dayjs(date.to);
    logger.info("Generating transactions for range:", { startDate: startDate.format(), endDate: endDate.format() });

    const generateTransactions = () => {
      const mockTransactions: Transaction[] = [];

      // Helper function to check if a date has occurred
      const hasDateOccurred = (checkDate: dayjs.Dayjs) => {
        return checkDate.isSameOrBefore(currentDate, 'day');
      };

      incomes.forEach(income => {
        if (income.source === "Majdi's Salary") {
          // Handle Majdi's twice-monthly salary
          let currentMonth = startDate.startOf('month');
          while (currentMonth.isSameOrBefore(endDate)) {
            // First payment of the month
            const firstPaymentDate = currentMonth.date(income.firstDate || 1);
            if (firstPaymentDate.isBetween(startDate, endDate, 'day', '[]')) {
              mockTransactions.push({
                date: firstPaymentDate.format('YYYY-MM-DD'),
                description: `${income.source} (1st payment)`,
                amount: income.amount,
                occurred: hasDateOccurred(firstPaymentDate)
              });
            }

            // Second payment of the month
            const secondPaymentDate = currentMonth.date(income.secondDate || 15);
            if (secondPaymentDate.isBetween(startDate, endDate, 'day', '[]')) {
              mockTransactions.push({
                date: secondPaymentDate.format('YYYY-MM-DD'),
                description: `${income.source} (2nd payment)`,
                amount: income.amount,
                occurred: hasDateOccurred(secondPaymentDate)
              });
            }

            currentMonth = currentMonth.add(1, 'month');
          }
        } else if (income.source === "Ruba's Salary") {
          // Handle Ruba's biweekly salary
          let currentDate = dayjs('2025-01-10'); // Start date for Ruba's salary
          while (currentDate.isSameOrBefore(endDate)) {
            if (currentDate.isSameOrAfter(startDate) && 
                currentDate.day() === 5) { // Only Fridays
              mockTransactions.push({
                date: currentDate.format('YYYY-MM-DD'),
                description: income.source,
                amount: income.amount,
                occurred: hasDateOccurred(currentDate)
              });
            }
            currentDate = currentDate.add(14, 'day'); // Move to next biweekly Friday
          }
        } else if (income.occurrenceType === 'once') {
          // Handle one-time income
          const incomeDate = dayjs(income.date);
          if (incomeDate.isBetween(startDate, endDate, 'day', '[]')) {
            mockTransactions.push({
              date: incomeDate.format('YYYY-MM-DD'),
              description: income.source,
              amount: income.amount,
              occurred: hasDateOccurred(incomeDate)
            });
          }
        }
      });

      return mockTransactions.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
    };

    const newTransactions = generateTransactions();
    logger.info("Generated transactions:", { count: newTransactions.length });

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
  }, [showReport, date?.from, date?.to, incomes, currentDate]);

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
                defaultMonth={currentDate.toDate()}
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
              <CardTitle className="text-sm font-medium">Received Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summaryTotals.occurred)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Expected Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(summaryTotals.pending)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction, index) => (
                <TableRow key={`${transaction.date}-${index}`}>
                  <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className="text-right">{formatCurrency(transaction.amount)}</TableCell>
                  <TableCell>
                    <span className={transaction.occurred ? 'text-green-600' : 'text-blue-600'}>
                      {transaction.occurred ? 'Received' : 'Expected'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}