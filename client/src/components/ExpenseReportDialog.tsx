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

export default function ExpenseReportDialog({ isOpen, onOpenChange }: ExpenseReportDialogProps) {
  const [date, setDate] = useState<DateRange | undefined>();
  const [showReport, setShowReport] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const currentDate = useMemo(() => dayjs('2025-02-18'), []); 

  useEffect(() => {
    if (!isOpen) {
      setDate(undefined);
      setShowReport(false);
      setDateError(null);
    }
  }, [isOpen]);

  const handleDateSelect = (newDate: DateRange | undefined) => {
    setDate(newDate);
  };

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/transactions'],
    enabled: showReport,
  });

  const filteredTransactions = useMemo(() => {
    if (!date?.from || !date?.to || !transactions.length) return [];

    return transactions
      .filter(transaction => {
        if (transaction.type !== 'expense') return false;
        const transactionDate = dayjs(transaction.date);
        return transactionDate.isSameOrAfter(dayjs(date.from), 'day') &&
               transactionDate.isSameOrBefore(dayjs(date.to), 'day');
      })
      .map(transaction => ({
        ...transaction,
        occurred: dayjs(transaction.date).isSameOrBefore(currentDate)
      }));
  }, [transactions, date, currentDate]);

  const totals = useMemo(() => {
    const paid = filteredTransactions
      .filter(t => t.occurred)
      .reduce((sum, t) => sum + t.amount, 0);
    const pending = filteredTransactions
      .filter(t => !t.occurred)
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      total: paid + pending,
      paid,
      pending
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
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions
                      .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
                      .map((transaction) => (
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}