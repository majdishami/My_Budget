import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';
import {
  Table,
  TableBody,
  TableCaption,
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
  const today = dayjs();
  const startOfMonth = today.startOf('month');

  useEffect(() => {
    // Simulated data - replace with actual API call
    const mockTransactions: Transaction[] = [
      {
        date: '2024-02-01',
        description: "Ruba's Salary",
        amount: 4739,
        type: 'income'
      },
      {
        date: '2024-02-01',
        description: 'Monthly Rent',
        amount: 3750,
        type: 'expense'
      },
      {
        date: '2024-02-02',
        description: 'Freelance Work',
        amount: 1200,
        type: 'income'
      },
      {
        date: '2024-02-02',
        description: 'Utilities',
        amount: 250,
        type: 'expense'
      }
    ];

    setTransactions(mockTransactions);
  }, []);

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
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">
        Monthly Report - {today.format('MMMM YYYY')} (Up to {today.format('MMMM D')})
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.income)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totals.expenses)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(netBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income Transactions</CardTitle>
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
        <CardHeader>
          <CardTitle>Expense Transactions</CardTitle>
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
  );
}