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
import { logger } from '@/lib/logger';

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
  const today = useMemo(() => dayjs(), []);
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
    logger.info("Generating transactions for range:", { startDate: startDate.format(), endDate: endDate.format() });

    const generateTransactions = () => {
      const mockTransactions: Transaction[] = [];

      // Helper function to check if a date has occurred
      const hasDateOccurred = (checkDate: dayjs.Dayjs) => {
        return checkDate.isSameOrBefore(today, 'day');
      };

      incomes.forEach(income => {
        const incomeStartDate = dayjs(income.date);

        if (income.occurrenceType === 'once') {
          // Handle one-time income
          if (incomeStartDate.isBetween(startDate, endDate, 'day', '[]')) {
            mockTransactions.push({
              date: incomeStartDate.format('YYYY-MM-DD'),
              description: income.source,
              amount: income.amount,
              occurred: hasDateOccurred(incomeStartDate)
            });
          }
        } else if (income.occurrenceType === 'weekly') {
          // Weekly income
          let currentDate = startDate.startOf('day');
          while (currentDate.isSameOrBefore(endDate)) {
            if (currentDate.isSameOrAfter(incomeStartDate)) {
              mockTransactions.push({
                date: currentDate.format('YYYY-MM-DD'),
                description: income.source,
                amount: income.amount,
                occurred: hasDateOccurred(currentDate)
              });
            }
            currentDate = currentDate.add(1, 'week');
          }
        } else if (income.occurrenceType === 'biweekly') {
          // Bi-weekly income (every two weeks)
          let currentDate = startDate.startOf('day');
          while (currentDate.isSameOrBefore(endDate)) {
            if (currentDate.isSameOrAfter(incomeStartDate)) {
              mockTransactions.push({
                date: currentDate.format('YYYY-MM-DD'),
                description: income.source,
                amount: income.amount,
                occurred: hasDateOccurred(currentDate)
              });
            }
            currentDate = currentDate.add(2, 'week');
          }
        } else if (income.occurrenceType === 'monthly') {
          // Monthly income
          let currentDate = startDate.startOf('month');
          while (currentDate.isSameOrBefore(endDate)) {
            const paymentDate = currentDate.date(incomeStartDate.date());
            if (paymentDate.isBetween(startDate, endDate, 'day', '[]') && 
                paymentDate.isSameOrAfter(incomeStartDate)) {
              mockTransactions.push({
                date: paymentDate.format('YYYY-MM-DD'),
                description: income.source,
                amount: income.amount,
                occurred: hasDateOccurred(paymentDate)
              });
            }
            currentDate = currentDate.add(1, 'month');
          }
        } else if (income.occurrenceType === 'twice-monthly') {
          // Twice monthly income (e.g., 1st and 15th)
          let currentDate = startDate.startOf('month');
          while (currentDate.isSameOrBefore(endDate)) {
            // First payment of the month
            if (income.firstDate) {
              const firstPayment = currentDate.date(income.firstDate);
              if (firstPayment.isBetween(startDate, endDate, 'day', '[]') && 
                  firstPayment.isSameOrAfter(incomeStartDate)) {
                mockTransactions.push({
                  date: firstPayment.format('YYYY-MM-DD'),
                  description: income.source,
                  amount: income.amount,
                  occurred: hasDateOccurred(firstPayment)
                });
              }
            }

            // Second payment of the month
            if (income.secondDate) {
              const secondPayment = currentDate.date(income.secondDate);
              if (secondPayment.isBetween(startDate, endDate, 'day', '[]') && 
                  secondPayment.isSameOrAfter(incomeStartDate)) {
                mockTransactions.push({
                  date: secondPayment.format('YYYY-MM-DD'),
                  description: income.source,
                  amount: income.amount,
                  occurred: hasDateOccurred(secondPayment)
                });
              }
            }

            currentDate = currentDate.add(1, 'month');
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
              <div className="text-2xl font-bold text-green-100">{formatCurrency(summaryTotals.pending)}</div>
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
                  <TableCell className={transaction.occurred ? 'text-green-600' : 'text-green-100'}>
                    {transaction.description}
                  </TableCell>
                  <TableCell className={`text-right ${transaction.occurred ? 'text-green-600' : 'text-green-100'}`}>
                    {formatCurrency(transaction.amount)}</TableCell>
                  <TableCell className={transaction.occurred ? 'text-green-600' : 'text-green-100'}>
                    {transaction.occurred ? 'Received' : 'Expected'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}