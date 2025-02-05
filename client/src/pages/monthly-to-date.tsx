import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';
import { useLocation } from 'wouter';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

export default function MonthlyToDateReport() {
  const today = dayjs();
  const startOfMonth = today.startOf('month').format('YYYY-MM-DD');
  const endOfMonth = today.endOf('month').format('YYYY-MM-DD');
  const [, setLocation] = useLocation();

  const { data: transactions = [], isLoading, error } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions/monthly', { startDate: startOfMonth, endDate: endOfMonth }],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-5xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-5xl">
        <div className="text-red-600">Error loading transactions. Please try again.</div>
      </div>
    );
  }

  const totals = transactions.reduce(
    (acc, transaction) => {
      if (transaction.type === 'income') {
        acc.income += Number(transaction.amount);
      } else {
        acc.expenses += Number(transaction.amount);
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
                  .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
                  .map((transaction) => (
                    <TableRow key={transaction.id}>
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
                  .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
                  .map((transaction) => (
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
    </div>
  );
}