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

interface ExpenseReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: ExpenseTransaction[];
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export default function ExpenseReportDialog({ 
  isOpen, 
  onOpenChange, 
  expenses,
  dateRange 
}: ExpenseReportDialogProps) {
  const today = dayjs();

  // Process transactions with pending status
  const processedTransactions = expenses.map(transaction => ({
    ...transaction,
    isPending: dayjs(transaction.date).isAfter(today)
  }));

  // Calculate totals
  const totals = processedTransactions.reduce(
    (acc, t) => {
      if (t.isPending) {
        acc.pending += t.amount;
      } else {
        acc.completed += t.amount;
      }
      return acc;
    },
    { completed: 0, pending: 0 }
  );

  const total = totals.completed + totals.pending;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onOpenChange(false)}
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
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(totals.completed)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(totals.pending)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
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
                  {processedTransactions
                    .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
                    .map((transaction) => (
                      <TableRow 
                        key={transaction.id}
                        className={transaction.isPending ? "bg-yellow-50" : ""}
                      >
                        <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>{transaction.category_name || 'Uncategorized'}</TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell>
                          {transaction.isPending ? (
                            <span className="text-yellow-600 font-medium">Pending</span>
                          ) : (
                            <span className="text-green-600 font-medium">Completed</span>
                          )}
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