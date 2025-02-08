// External dependencies
import { useState, useEffect } from 'react';
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
  const [date, setDate] = useState<DateRange | undefined>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showReport, setShowReport] = useState(false);
  const today = dayjs(); // Use actual current date

  useEffect(() => {
    if (!isOpen) {
      setDate(undefined);
      setShowReport(false);
      setTransactions([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!showReport || !date?.from || !date?.to) return;

    const startDate = dayjs(date.from);
    const endDate = dayjs(date.to);
    const mockTransactions: Transaction[] = [];

    // Generate transactions based on provided incomes
    incomes.forEach(income => {
      if (income.source === "Majdi's Salary") {
        // Calculate monthly occurrences within the date range
        let currentDate = startDate.startOf('month');

        while (currentDate.isSameOrBefore(endDate)) {
          const firstPayday = currentDate.date(1);
          const fifteenthPayday = currentDate.date(15);

          // Only add transactions that fall within the date range
          if (firstPayday.isBetween(startDate, endDate, 'day', '[]')) {
            mockTransactions.push({
              date: firstPayday.format('YYYY-MM-DD'),
              description: income.source,
              amount: income.amount / 2, // Split monthly amount
              occurred: firstPayday.isSameOrBefore(today)
            });
          }

          if (fifteenthPayday.isBetween(startDate, endDate, 'day', '[]')) {
            mockTransactions.push({
              date: fifteenthPayday.format('YYYY-MM-DD'),
              description: income.source,
              amount: income.amount / 2, // Split monthly amount
              occurred: fifteenthPayday.isSameOrBefore(today)
            });
          }

          currentDate = currentDate.add(1, 'month');
        }
      } else if (income.source === "Ruba's Salary") {
        // Find the first bi-weekly payment date that's not before the start date
        let payDate = dayjs('2025-01-10'); // Initial bi-weekly payment date
        while (payDate.isBefore(startDate)) {
          payDate = payDate.add(14, 'day');
        }

        // Add bi-weekly occurrences within range
        while (payDate.isSameOrBefore(endDate)) {
          mockTransactions.push({
            date: payDate.format('YYYY-MM-DD'),
            description: income.source,
            amount: income.amount,
            occurred: payDate.isSameOrBefore(today)
          });
          payDate = payDate.add(14, 'day');
        }
      }
    });

    // Sort transactions by date
    mockTransactions.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
    setTransactions(mockTransactions);
  }, [showReport, date, incomes, today]);

  const summary = transactions.reduce(
    (acc, transaction) => {
      const amount = Math.round(transaction.amount);
      // Track by source first
      if (transaction.description === "Majdi's Salary") {
        if (transaction.occurred) {
          acc.majdiOccurred += amount;
        } else {
          acc.majdiFuture += amount;
        }
      } else if (transaction.description === "Ruba's Salary") {
        if (transaction.occurred) {
          acc.rubaOccurred += amount;
        } else {
          acc.rubaFuture += amount;
        }
      }
      // Also track total occurred/future
      if (transaction.occurred) {
        acc.totalOccurred += amount;
      } else {
        acc.totalFuture += amount;
      }
      return acc;
    },
    { 
      majdiOccurred: 0, 
      majdiFuture: 0, 
      rubaOccurred: 0, 
      rubaFuture: 0,
      totalOccurred: 0,
      totalFuture: 0
    }
  );

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
            <div>
              <Button
                variant="outline"
                onClick={() => {
                  setDate(undefined);
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
            </div>
            <div>
              <Button
                onClick={() => setShowReport(true)}
                disabled={!date?.from || !date?.to}
              >
                Generate Report
              </Button>
            </div>
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

        {/* Source-specific Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Majdi's Income */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Majdi's Income</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-green-600">
                Received: {formatCurrency(summary.majdiOccurred)}
              </div>
              <div className="text-green-300">
                Pending: {formatCurrency(summary.majdiFuture)}
              </div>
              <div className="font-bold text-green-600">
                Total: {formatCurrency(summary.majdiOccurred + summary.majdiFuture)}
              </div>
            </CardContent>
          </Card>

          {/* Ruba's Income */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Ruba's Income</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-green-600">
                Received: {formatCurrency(summary.rubaOccurred)}
              </div>
              <div className="text-green-300">
                Pending: {formatCurrency(summary.rubaFuture)}
              </div>
              <div className="font-bold text-green-600">
                Total: {formatCurrency(summary.rubaOccurred + summary.rubaFuture)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overall Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalOccurred + summary.totalFuture)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Received</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalOccurred)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-300">
                {formatCurrency(summary.totalFuture)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Tables */}
        <div className="space-y-4">
          {/* Majdi's Income Transactions */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Majdi's Income Transactions</CardTitle>
            </CardHeader>
            <CardContent>
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
                  {transactions
                    .filter(t => t.description === "Majdi's Salary")
                    .map((transaction, index) => (
                      <TableRow key={index}>
                        <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className={`text-right ${transaction.occurred ? 'text-green-600' : 'text-green-300'}`}>
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell className={transaction.occurred ? 'text-green-600' : 'text-green-300'}>
                          {transaction.occurred ? 'Received' : 'Pending'}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Ruba's Income Transactions */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Ruba's Income Transactions</CardTitle>
            </CardHeader>
            <CardContent>
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
                  {transactions
                    .filter(t => t.description === "Ruba's Salary")
                    .map((transaction, index) => (
                      <TableRow key={index}>
                        <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className={`text-right ${transaction.occurred ? 'text-green-600' : 'text-green-300'}`}>
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell className={transaction.occurred ? 'text-green-600' : 'text-green-300'}>
                          {transaction.occurred ? 'Received' : 'Pending'}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}