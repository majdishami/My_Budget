import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";
import { formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'expense';
  occurred: boolean;
}

interface ExpenseReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MonthlyTransactions {
  monthKey: string;
  transactions: Transaction[];
  total: number;
  paid: number;
  pending: number;
}

export default function ExpenseReportDialog({ isOpen, onOpenChange }: ExpenseReportDialogProps) {
  const [date, setDate] = useState<DateRange | undefined>();
  const [showReport, setShowReport] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const currentDate = useMemo(() => dayjs('2025-02-18'), []); // Fixed current date

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setDate(undefined);
      setShowReport(false);
      setDateError(null);
    }
  }, [isOpen]);

  // Query transactions for the selected date range
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/transactions', { 
      type: 'expense',
      // Do not use startOf/endOf month to allow precise date range selection
      startDate: date?.from?.toISOString(),
      endDate: date?.to?.toISOString()
    }],
    enabled: showReport && !!date?.from && !!date?.to
  });

  // Filter transactions by date range and type
  const filteredTransactions = useMemo(() => {
    if (!date?.from || !date?.to || !transactions.length) return [];

    return transactions
      .filter(transaction => {
        // Only include expense transactions
        if (transaction.type !== 'expense') return false;

        // Check if transaction date is within the selected range
        const transactionDate = dayjs(transaction.date);
        return transactionDate.isSameOrAfter(dayjs(date.from), 'day') &&
               transactionDate.isSameOrBefore(dayjs(date.to), 'day');
      })
      .map(transaction => ({
        ...transaction,
        occurred: dayjs(transaction.date).isSameOrBefore(currentDate)
      }));
  }, [transactions, date, currentDate]);

  // Group transactions by month
  const monthlyData = useMemo(() => {
    if (!filteredTransactions.length) return [];

    const monthGroups: Record<string, Transaction[]> = {};

    // Group transactions by month
    filteredTransactions.forEach(transaction => {
      const monthKey = dayjs(transaction.date).format('YYYY-MM');
      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = [];
      }
      monthGroups[monthKey].push(transaction);
    });

    // Convert groups to array and calculate totals
    return Object.entries(monthGroups)
      .map(([monthKey, transactions]) => {
        const total = transactions.reduce((sum, t) => sum + t.amount, 0);
        const paid = transactions
          .filter(t => t.occurred)
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          monthKey,
          transactions: transactions.sort((a, b) => dayjs(a.date).diff(dayjs(b.date))),
          total,
          paid,
          pending: total - paid
        };
      })
      .sort((a, b) => dayjs(a.monthKey).diff(dayjs(b.monthKey)));
  }, [filteredTransactions]);

  // Calculate overall totals
  const totals = useMemo(() => {
    const total = monthlyData.reduce((sum, month) => sum + month.total, 0);
    const paid = monthlyData.reduce((sum, month) => sum + month.paid, 0);
    return {
      total,
      paid,
      pending: total - paid
    };
  }, [monthlyData]);

  if (!showReport) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Date Range</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col space-y-4">
            <div className="border rounded-lg p-4">
              <Calendar
                mode="range"
                selected={date}
                onSelect={handleDateSelect}
                numberOfMonths={1}
                defaultMonth={currentDate.toDate()}
              />
            </div>

            <div className="text-sm text-muted-foreground text-center">
              {date?.from ? (
                <>
                  {dayjs(date.from).format('MMM D, YYYY')}
                  {date.to ? ` - ${dayjs(date.to).format('MMM D, YYYY')}` : ''}
                </>
              ) : (
                'Select start and end dates'
              )}
            </div>

            {dateError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{dateError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
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
              onClick={() => {
                if (!date?.from || !date?.to) {
                  setDateError("Please select start and end dates");
                  return;
                }
                setDateError(null);
                setShowReport(true);
              }}
              disabled={!date?.from || !date?.to || transactionsLoading}
            >
              {transactionsLoading ? "Loading..." : "Generate Report"}
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
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl">
              Expense Report
            </DialogTitle>
            <Button variant="outline" onClick={() => setShowReport(false)}>
              Back to Selection
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {dayjs(date?.from).format('MMM D, YYYY')} - {dayjs(date?.to).format('MMM D, YYYY')}
          </div>
        </DialogHeader>

        {transactionsLoading ? (
          <div className="flex justify-center items-center p-8">
            <span className="text-muted-foreground">Loading report data...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totals.total)}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Paid</div>
                    <div className="text-lg font-semibold text-red-600">
                      {formatCurrency(totals.paid)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                    <div className="text-lg font-semibold text-yellow-600">
                      {formatCurrency(totals.pending)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Breakdown */}
            {monthlyData.map(month => (
              <Card key={month.monthKey}>
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex justify-between items-center">
                    <span>{dayjs(month.monthKey).format('MMMM YYYY')}</span>
                    <span className="text-base">
                      Total: {formatCurrency(month.total)}
                    </span>
                  </CardTitle>
                  <div className="text-sm space-y-1">
                    <div className="text-red-600">
                      Paid: {formatCurrency(month.paid)}
                    </div>
                    <div className="text-yellow-600">
                      Pending: {formatCurrency(month.pending)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
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
                      {month.transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell>
                            <span className={transaction.occurred ? "text-red-600" : "text-yellow-600"}>
                              {transaction.occurred ? 'Paid' : 'Pending'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}