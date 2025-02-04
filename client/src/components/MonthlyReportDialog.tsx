import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

interface MonthlyReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MonthlyReportDialog({ isOpen, onOpenChange }: MonthlyReportDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const today = dayjs('2025-02-04'); // Current date
  const startOfMonth = today.startOf('month');
  const endOfMonth = today.endOf('month');

  useEffect(() => {
    if (!isOpen) return;

    const mockTransactions: Transaction[] = [];

    // Add Majdi's salary for February
    mockTransactions.push({
      date: '2025-02-01',
      description: "Majdi's Salary",
      amount: Math.round(4739),
      type: 'income'
    });
    mockTransactions.push({
      date: '2025-02-15',
      description: "Majdi's Salary",
      amount: Math.round(4739),
      type: 'income'
    });

    // Add Ruba's bi-weekly salary for February
    mockTransactions.push({
      date: '2025-02-07',
      description: "Ruba's Salary",
      amount: Math.round(2168),
      type: 'income'
    });
    mockTransactions.push({
      date: '2025-02-21',
      description: "Ruba's Salary",
      amount: Math.round(2168),
      type: 'income'
    });

    // Add all February expenses
    const februaryExpenses = [
      { day: 1, name: 'ATT Phone Bill', amount: 429 },
      { day: 1, name: "Maid's 1st payment", amount: 120 },
      { day: 1, name: 'Monthly Rent', amount: 3750 },
      { day: 3, name: 'Sling TV', amount: 75 },
      { day: 6, name: 'Cox Internet', amount: 81 },
      { day: 7, name: 'Water Bill', amount: 80 },
      { day: 7, name: 'NV Energy Electrical', amount: 250 },
      { day: 9, name: 'TransAmerica Life Insurance', amount: 77 },
      { day: 14, name: 'Credit Card minimum payments', amount: 225 },
      { day: 14, name: 'Apple/Google/YouTube', amount: 130 },
      { day: 16, name: 'Expenses & Groceries', amount: 3000 },
      { day: 17, name: "Maid's 2nd Payment", amount: 120 },
      { day: 17, name: 'SoFi Personal Loan', amount: 1915 },
      { day: 17, name: 'Southwest Gas', amount: 75 },
      { day: 28, name: 'Car Insurance for 3 cars', amount: 704 }
    ];

    februaryExpenses.forEach(expense => {
      mockTransactions.push({
        date: `2025-02-${String(expense.day).padStart(2, '0')}`,
        description: expense.name,
        amount: Math.round(expense.amount),
        type: 'expense'
      });
    });

    setTransactions(mockTransactions);
  }, [isOpen]);

  const totals = transactions.reduce(
    (acc, transaction) => {
      if (transaction.type === 'income') {
        acc.income += Math.round(transaction.amount);
      } else {
        acc.expenses += Math.round(transaction.amount);
      }
      return acc;
    },
    { income: 0, expenses: 0 }
  );

  const monthlyBalance = Math.round(totals.income - totals.expenses);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Monthly Report - {today.format('MMMM YYYY')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Total Monthly Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.income)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Total Monthly Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totals.expenses)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Monthly Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${monthlyBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(monthlyBalance)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Income Transactions</CardTitle>
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
                  {transactions
                    .filter(t => t.type === 'income')
                    .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
                    .map((transaction, index) => (
                      <TableRow key={index}>
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

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Expense Transactions</CardTitle>
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
                  {transactions
                    .filter(t => t.type === 'expense')
                    .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
                    .map((transaction, index) => (
                      <TableRow key={index}>
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
      </DialogContent>
    </Dialog>
  );
}
