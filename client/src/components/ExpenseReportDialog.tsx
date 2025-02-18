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

// Define type for category summary
type CategorySummary = {
  name: string;
  color: string;
  icon?: string;
  total: number;
  pendingTotal: number;
  completedTotal: number;
  transactions: ProcessedTransaction[];
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

  // Group transactions by category
  const categorySummaries = useMemo(() => {
    const summaries = new Map<string, CategorySummary>();

    processedTransactions.forEach(transaction => {
      const categoryName = transaction.category_name || 'Uncategorized';

      if (!summaries.has(categoryName)) {
        summaries.set(categoryName, {
          name: categoryName,
          color: transaction.category_color || '#808080',
          icon: transaction.category_icon,
          total: 0,
          pendingTotal: 0,
          completedTotal: 0,
          transactions: []
        });
      }

      const summary = summaries.get(categoryName)!;
      summary.total += transaction.amount;
      if (transaction.isPending) {
        summary.pendingTotal += transaction.amount;
      } else {
        summary.completedTotal += transaction.amount;
      }
      summary.transactions.push(transaction);
    });

    // Sort transactions within each category
    summaries.forEach(summary => {
      summary.transactions.sort(safeSortByDate);
    });

    return Array.from(summaries.values()).sort((a, b) => b.total - a.total);
  }, [processedTransactions]);

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

          {/* Category Summaries */}
          {categorySummaries.map(category => (
            <Card key={category.name}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span style={{ color: category.color }}>{category.name}</span>
                  <span className="text-lg font-bold text-red-600">
                    {formatCurrency(category.total)}
                  </span>
                </CardTitle>
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
                    {category.transactions.map((transaction) => (
                      <TableRow 
                        key={transaction.id}
                        className={getRowClass(transaction.isPending)}
                      >
                        <TableCell>{dayjs(transaction.displayDate).format('MMM D, YYYY')}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
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
                    <TableRow className="font-medium">
                      <TableCell colSpan={2}>Category Total</TableCell>
                      <TableCell className="text-right text-red-600 font-bold">
                        {formatCurrency(category.total)}
                      </TableCell>
                      <TableCell>
                        <span className="text-yellow-600">
                          Pending: {formatCurrency(category.pendingTotal)}
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}

          {categorySummaries.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No expenses found for the selected period.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters or selecting a different date range.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}