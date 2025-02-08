import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useState, useEffect, useMemo } from 'react';
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
import { X } from "lucide-react";

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
  const today = dayjs(); // Use actual current date
  const reportDate = today.format('MMMM D, YYYY');
  const startOfMonth = today.startOf('month');
  const endOfMonth = today.endOf('month');

  useEffect(() => {
    if (!isOpen) return;

    const mockTransactions: Transaction[] = [];
    const currentYear = today.year();
    const currentMonth = today.month() + 1;

    // Add Majdi's salary
    mockTransactions.push({
      date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
      description: "Majdi's Salary",
      amount: Math.round(4739),
      type: 'income'
    });
    mockTransactions.push({
      date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-15`,
      description: "Majdi's Salary",
      amount: Math.round(4739),
      type: 'income'
    });

    // Add Ruba's bi-weekly salary
    const rubaPayDates = ['07', '21'];
    rubaPayDates.forEach(day => {
      mockTransactions.push({
        date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${day}`,
        description: "Ruba's Salary",
        amount: Math.round(2168),
        type: 'income'
      });
    });

    // Add monthly expenses
    const monthlyExpenses = [
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

    monthlyExpenses.forEach(expense => {
      mockTransactions.push({
        date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(expense.day).padStart(2, '0')}`,
        description: expense.name,
        amount: Math.round(expense.amount),
        type: 'expense'
      });
    });

    setTransactions(mockTransactions);
  }, [isOpen, today]);

  // Calculate occurred and pending transactions
  const {
    occurred,
    pending,
    summary
  } = useMemo(() => {
    const occurred = {
      income: transactions.filter(t => 
        t.type === 'income' && dayjs(t.date).isSameOrBefore(today)
      ).sort((a, b) => dayjs(a.date).diff(dayjs(b.date))),
      expenses: transactions.filter(t => 
        t.type === 'expense' && dayjs(t.date).isSameOrBefore(today)
      ).sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
    };

    const pending = {
      income: transactions.filter(t => 
        t.type === 'income' && dayjs(t.date).isAfter(today)
      ).sort((a, b) => dayjs(a.date).diff(dayjs(b.date))),
      expenses: transactions.filter(t => 
        t.type === 'expense' && dayjs(t.date).isAfter(today)
      ).sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
    };

    const summary = {
      occurred: {
        income: occurred.income.reduce((sum, t) => sum + t.amount, 0),
        expenses: occurred.expenses.reduce((sum, t) => sum + t.amount, 0),
        balance: occurred.income.reduce((sum, t) => sum + t.amount, 0) - 
                occurred.expenses.reduce((sum, t) => sum + t.amount, 0)
      },
      pending: {
        income: pending.income.reduce((sum, t) => sum + t.amount, 0),
        expenses: pending.expenses.reduce((sum, t) => sum + t.amount, 0),
        balance: pending.income.reduce((sum, t) => sum + t.amount, 0) - 
                pending.expenses.reduce((sum, t) => sum + t.amount, 0)
      },
      total: {
        income: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        expenses: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
        balance: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) -
                transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
      }
    };

    return { occurred, pending, summary };
  }, [transactions, today]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            <div>
              Monthly Report - {today.format('MMMM YYYY')}
              <div className="text-sm text-muted-foreground mt-1">
                Report generated on {reportDate}
              </div>
            </div>
            <DialogClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogTitle>
        </DialogHeader>

        {/* Monthly Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Month To Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.occurred.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.occurred.balance)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Income: {formatCurrency(summary.occurred.income)}<br />
                Expenses: {formatCurrency(summary.occurred.expenses)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.pending.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.pending.balance)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Income: {formatCurrency(summary.pending.income)}<br />
                Expenses: {formatCurrency(summary.pending.expenses)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.total.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.total.balance)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Income: {formatCurrency(summary.total.income)}<br />
                Expenses: {formatCurrency(summary.total.expenses)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Occurred Transactions */}
        <div className="space-y-4 mb-8">
          <h3 className="text-lg font-semibold border-b pb-2">Month to Date Transactions</h3>

          {/* Occurred Income */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Income Received</CardTitle>
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
                  {occurred.income.map((transaction, index) => (
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

          {/* Occurred Expenses */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Expenses Paid</CardTitle>
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
                  {occurred.expenses.map((transaction, index) => (
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

        {/* Pending Transactions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Remaining Transactions</h3>

          {/* Pending Income */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Expected Income</CardTitle>
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
                  {pending.income.map((transaction, index) => (
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

          {/* Pending Expenses */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Upcoming Expenses</CardTitle>
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
                  {pending.expenses.map((transaction, index) => (
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