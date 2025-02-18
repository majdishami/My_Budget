import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import { useState, useMemo } from 'react';

// Define strict types for transactions
type ExpenseTransaction = {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'expense';
  category_name?: string;
  category_color?: string;
  category_icon?: string;
};

// Define type for processed transaction with additional fields
type ProcessedTransaction = ExpenseTransaction & {
  isPending: boolean;
  displayDate: string;
};

interface ExpenseReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: ExpenseTransaction[];
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  onBack?: () => void;
}

// Styling helper functions
const getStatusClass = (isPending: boolean) =>
  isPending ? "text-yellow-600 font-medium" : "text-green-600 font-medium";

const getRowClass = (isPending: boolean) =>
  isPending ? "bg-yellow-50" : "";

const getAmountClass = () => "text-right text-red-600";

const getStatusText = (isPending: boolean) =>
  isPending ? "Pending" : "Completed";

const getTotalClass = (type: 'completed' | 'pending' | 'total') => {
  switch (type) {
    case 'pending':
      return "text-2xl font-bold text-yellow-600";
    case 'total':
    case 'completed':
      return "text-2xl font-bold text-red-600";
  }
};

// Safe sorting function for transactions
const safeSortByDate = (a: ProcessedTransaction, b: ProcessedTransaction) => {
  const dateA = dayjs(a.displayDate);
  const dateB = dayjs(b.displayDate);

  // If either date is invalid, push it to the end
  if (!dateA.isValid() && !dateB.isValid()) return 0;
  if (!dateA.isValid()) return 1;
  if (!dateB.isValid()) return -1;

  return dateB.diff(dateA);
};

export default function ExpenseReportDialog({ 
  isOpen, 
  onOpenChange, 
  expenses,
  dateRange,
  onBack 
}: ExpenseReportDialogProps) {
  const today = useMemo(() => dayjs(), []); // Memoize today since it's used in calculations

  // Process transactions with pending status and handle invalid dates
  const processedTransactions: ProcessedTransaction[] = useMemo(() => expenses.map(transaction => {
    const transactionDate = dayjs(transaction.date);

    // Log invalid dates for debugging
    if (!transactionDate.isValid()) {
      logger.warn("[ExpenseReportDialog] Invalid transaction date:", {
        transactionId: transaction.id,
        date: transaction.date
      });
    }

    return {
      ...transaction,
      // Only mark as pending if we have a valid date and it's in the future
      isPending: transactionDate.isValid() && transactionDate.isAfter(today),
      // Use current date as fallback for invalid dates
      displayDate: transactionDate.isValid() ? 
        transactionDate.format('YYYY-MM-DD') : 
        today.format('YYYY-MM-DD')
    };
  }), [expenses, today]);

  // Calculate totals with safe date handling
  const totals = useMemo(() => processedTransactions.reduce(
    (acc, t) => {
      if (t.isPending) {
        acc.pending += t.amount;
      } else {
        acc.completed += t.amount;
      }
      return acc;
    },
    { completed: 0, pending: 0 }
  ), [processedTransactions]);

  const total = totals.completed + totals.pending;

  // Memoize sorted transactions
  const sortedTransactions = useMemo(() => 
    [...processedTransactions].sort(safeSortByDate),
    [processedTransactions]
  );

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleBack}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-xl">
            Expense Report
            <div className="text-sm font-normal text-muted-foreground mt-1">
              {dateRange?.from ? (
                <>
                  {dayjs(dateRange.from).format('MMM D, YYYY')} - {dateRange.to ? dayjs(dateRange.to).format('MMM D, YYYY') : ''}
                </>
              ) : (
                'All Time'
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Completed Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={getTotalClass('completed')}>
                  {formatCurrency(totals.completed)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={getTotalClass('pending')}>
                  {formatCurrency(totals.pending)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={getTotalClass('total')}>
                  {formatCurrency(total)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Expense Details</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedTransactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTransactions.map((transaction) => (
                      <TableRow 
                        key={transaction.id}
                        className={getRowClass(transaction.isPending)}
                      >
                        <TableCell>{dayjs(transaction.displayDate).format('MMM D, YYYY')}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>{transaction.category_name || 'Uncategorized'}</TableCell>
                        <TableCell className={getAmountClass()}>
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell>
                          <span className={getStatusClass(transaction.isPending)}>
                            {getStatusText(transaction.isPending)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No expenses found for the selected period.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your filters or selecting a different date range.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}