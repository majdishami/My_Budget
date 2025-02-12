import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, getCurrentDate } from '@/lib/utils';
import dayjs from 'dayjs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X, Calendar, AlertCircle } from "lucide-react";

interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

interface MonthlyToDateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MonthlyToDateDialog({ isOpen, onOpenChange }: MonthlyToDateDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const today = getCurrentDate();
  const startOfMonth = today.startOf('month');
  const endOfMonth = today.endOf('month');

  useEffect(() => {
    if (!isOpen) return;

    const mockTransactions: Transaction[] = [];

    // Add Majdi's salary occurrences for the current month
    const currentMonth = today.month();
    const currentYear = today.year();

    // First salary of the month
    if (today.date() >= 1) {
      mockTransactions.push({
        date: today.date(1).format('YYYY-MM-DD'),
        description: "Majdi's Salary",
        amount: 4739,
        type: 'income'
      });
    }

    // 15th salary
    if (today.date() >= 15) {
      mockTransactions.push({
        date: today.date(15).format('YYYY-MM-DD'),
        description: "Majdi's Salary",
        amount: 4739,
        type: 'income'
      });
    }

    // Add Ruba's bi-weekly salary
    if (today.date() >= 7) {
      mockTransactions.push({
        date: today.date(7).format('YYYY-MM-DD'),
        description: "Ruba's Salary",
        amount: 2168,
        type: 'income'
      });
    }

    if (today.date() >= 21) {
      mockTransactions.push({
        date: today.date(21).format('YYYY-MM-DD'),
        description: "Ruba's Salary",
        amount: 2168,
        type: 'income'
      });
    }

    // Add Monthly Expenses
    const monthlyExpenses = [
      { description: 'ATT Phone Bill', amount: 429, date: 1 },
      { description: "Maid's 1st payment", amount: 120, date: 1 },
      { description: 'Monthly Rent', amount: 3750, date: 1 },
      { description: 'Sling TV', amount: 75, date: 3 },
      { description: 'Cox Internet', amount: 81, date: 6 },
      { description: 'Water Bill', amount: 80, date: 7 },
      { description: 'NV Energy Electrical', amount: 250, date: 7 },
      { description: 'TransAmerica Life Insurance', amount: 77, date: 9 },
      { description: 'Credit Card minimum payments', amount: 225, date: 14 },
      { description: 'Apple/Google/YouTube', amount: 130, date: 14 },
      { description: 'Expenses & Groceries', amount: 3000, date: 16 },
      { description: "Maid's 2nd Payment", amount: 120, date: 17 },
      { description: 'SoFi Personal Loan', amount: 1915, date: 17 },
      { description: 'Southwest Gas', amount: 75, date: 17 },
      { description: 'Car Insurance for 3 cars', amount: 704, date: 28 }
    ];

    monthlyExpenses.forEach(expense => {
      if (today.date() >= expense.date) {
        mockTransactions.push({
          date: today.date(expense.date).format('YYYY-MM-DD'),
          description: expense.description,
          amount: expense.amount,
          type: 'expense'
        });
      }
    });

    setTransactions(mockTransactions);
  }, [isOpen, today]);

  // Calculate totals
  const totals = transactions.reduce(
    (acc, transaction) => {
      if (transaction.type === 'income') {
        acc.income += transaction.amount;
      } else {
        acc.expenses += transaction.amount;
      }
      return acc;
    },
    { income: 0, expenses: 0 }
  );

  // Expected monthly totals
  const monthlyExpectedTotals = {
    income: 13814, // Majdi (4739 * 2) + Ruba (2168 * 2)
    expenses: 11031 // Sum of all monthly expenses
  };

  // Calculate remaining amounts
  const remaining = {
    income: monthlyExpectedTotals.income - totals.income,
    expenses: monthlyExpectedTotals.expenses - totals.expenses
  };

  const netBalance = totals.income - totals.expenses;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              Monthly Report - {today.format('MMMM YYYY')}
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-normal flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span>As of {today.format('MMMM D, YYYY')}</span>
              </div>
              <DialogClose asChild>
                <button
                  className="rounded-sm opacity-70 hover:opacity-100"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </DialogClose>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 pt-4">
          {/* Monthly Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-muted/50">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Total Occurred Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totals.income)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Remaining: {formatCurrency(remaining.income)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Total Incurred Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(totals.expenses)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Remaining: {formatCurrency(remaining.expenses)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Net Balance up to date</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(netBalance)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transactions Tables */}
          <div className="space-y-4">
            {/* Income Transactions */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Income Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter(t => t.type === 'income')
                      .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
                      .map((transaction, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Expense Transactions */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Expense Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter(t => t.type === 'expense')
                      .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
                      .map((transaction, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}