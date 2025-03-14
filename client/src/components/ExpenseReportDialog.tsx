import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateRange } from "react-day-picker";
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
import { useMemo } from 'react';

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

interface ExpenseReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: ExpenseTransaction[];
  dateRange: DateRange | undefined;
  onBack?: () => void;
}

export default function ExpenseReportDialog({ 
  isOpen, 
  onOpenChange, 
  expenses,
  dateRange,
  onBack 
}: ExpenseReportDialogProps) {
  const today = useMemo(() => dayjs(), []); 

  // Process transactions with pending status
  const processedTransactions = useMemo(() => expenses.map(transaction => {
    const transactionDate = dayjs(transaction.date);
    return {
      ...transaction,
      isPending: transactionDate.isValid() && transactionDate.isAfter(today),
      displayDate: transactionDate.isValid() ? 
        transactionDate.format('YYYY-MM-DD') : 
        today.format('YYYY-MM-DD')
    };
  }), [expenses, today]);

  // Calculate totals
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center space-x-2 sticky top-0 bg-background z-10 pb-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-lg">
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

        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2">
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-red-600">
                  {formatCurrency(totals.completed)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-yellow-600">
                  {formatCurrency(totals.pending)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-red-600">
                  {formatCurrency(total)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transactions Table */}
          <Card>
            <CardHeader className="py-2">
              <CardTitle>Transaction Details</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right w-24">Amount</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedTransactions
                      .sort((a, b) => dayjs(b.displayDate).diff(dayjs(a.displayDate)))
                      .map((transaction) => (
                        <TableRow 
                          key={transaction.id}
                          className={transaction.isPending ? "bg-yellow-50" : ""}
                        >
                          <TableCell className="whitespace-nowrap">
                            {dayjs(transaction.displayDate).format('MM/DD/YY')}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {transaction.description}
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600 whitespace-nowrap">
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell>
                            <span className={transaction.isPending ? "text-yellow-600" : "text-green-600"}>
                              {transaction.isPending ? 'Pending' : 'Done'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}