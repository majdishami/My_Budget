import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect, useMemo } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { DateRange } from "react-day-picker";
import dayjs from 'dayjs';
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from '@/lib/utils';
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
  type: 'expense' | 'income';
}

interface ExpenseReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExpenseReportDialog({ isOpen, onOpenChange }: ExpenseReportDialogProps) {
  const [date, setDate] = useState<DateRange | undefined>();
  const [showReport, setShowReport] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const currentDate = useMemo(() => dayjs(), []);

  useEffect(() => {
    if (!isOpen) {
      setDate(undefined);
      setShowReport(false);
      setDateError(null);
    }
  }, [isOpen]);

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions', { type: 'expense' }],
    enabled: showReport,
  });

  const filteredTransactions = useMemo(() => {
    if (!date?.from || !date?.to) return [];
    return transactions.filter(transaction => {
      const transactionDate = dayjs(transaction.date);
      return transactionDate.isBetween(dayjs(date.from).startOf('day'), dayjs(date.to).endOf('day'), 'day', '[]');
    });
  }, [transactions, date?.from, date?.to]);

  const totals = useMemo(() => {
    const total = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    return {
      total,
      paid: total, 
      pending: 0
    };
  }, [filteredTransactions]);

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
                onSelect={setDate}
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(totals.total)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}