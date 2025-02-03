import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';
import { useLocation } from 'wouter';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export default function MonthlyToDateReport() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const today = dayjs('2025-02-03'); // Current date from context
  const startOfMonth = today.startOf('month');
  const endOfMonth = today.endOf('month');
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Mock transactions with correct dates
    const mockTransactions: Transaction[] = [];

    // Add Majdi's salary (1st and 15th of the month)
    const majdiPayDates = ['01', '15'];
    majdiPayDates.forEach(day => {
      const payDate = today.format(`YYYY-MM-${day}`);
      // Only include if the pay date is not after today
      if (dayjs(payDate).isSame(today, 'day') || dayjs(payDate).isBefore(today)) {
        mockTransactions.push({
          date: payDate,
          description: "Majdi's Salary",
          amount: 4739,
          type: 'income'
        });
      }
    });

    // Calculate Ruba's bi-weekly salary dates
    const rubaStartDate = dayjs('2025-01-10'); // First pay date
    let nextPayDate = rubaStartDate;

    // Find the applicable pay dates for this month up to today
    while (nextPayDate.isBefore(today) || nextPayDate.isSame(today, 'day')) {
      if (nextPayDate.month() === today.month() && nextPayDate.date() <= today.date()) {
        mockTransactions.push({
          date: nextPayDate.format('YYYY-MM-DD'),
          description: "Ruba's Salary",
          amount: 2168,
          type: 'income'
        });
      }
      nextPayDate = nextPayDate.add(14, 'day');
    }

    // Add monthly expenses (only if we're past the 1st of the month)
    if (today.date() >= 1) {
      // Monthly Rent
      mockTransactions.push({
        date: today.startOf('month').format('YYYY-MM-DD'),
        description: 'Monthly Rent',
        amount: 3750,
        type: 'expense'
      });

      // Utilities
      mockTransactions.push({
        date: today.startOf('month').format('YYYY-MM-DD'),
        description: 'Utilities',
        amount: 250,
        type: 'expense'
      });
    }

    setTransactions(mockTransactions);
  }, [today]);

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

  const netBalance = totals.income - totals.expenses;

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          Monthly Report - {today.format('MMMM YYYY')} (Up to {today.format('MMMM D')})
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/')}
          className="hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.income)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totals.expenses)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(netBalance)}
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
    </div>
  );
}