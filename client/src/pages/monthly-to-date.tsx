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

export default function MonthlyToDateReport() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const today = dayjs('2025-02-03'); // Current date from context
  const startOfMonth = today.startOf('month');
  const endOfMonth = today.endOf('month');

  useEffect(() => {
    // Calculate Ruba's bi-weekly salary dates based on the pay schedule
    const rubaStartDate = dayjs('2025-01-10'); // First pay date
    let checkDate = rubaStartDate.clone();
    const rubaSalaryDates: string[] = [];

    while (checkDate.isBefore(endOfMonth) || checkDate.isSame(endOfMonth)) {
      if (checkDate.isAfter(startOfMonth) || checkDate.isSame(startOfMonth)) {
        if (checkDate.day() === 5) { // Friday
          const weeksDiff = checkDate.diff(rubaStartDate, 'week');
          if (weeksDiff >= 0 && weeksDiff % 2 === 0) {
            rubaSalaryDates.push(checkDate.format('YYYY-MM-DD'));
          }
        }
      }
      checkDate = checkDate.add(1, 'day');
    }

    // Mock transactions with correct dates
    const mockTransactions: Transaction[] = [];

    // Add Majdi's salary if it's already paid this month (1st of the month)
    if (today.date() >= 1) {
      mockTransactions.push({
        date: today.startOf('month').format('YYYY-MM-DD'),
        description: "Majdi's Salary",
        amount: 3500,
        type: 'income'
      });
    }

    // Add Ruba's bi-weekly salary occurrences
    rubaSalaryDates.forEach(date => {
      mockTransactions.push({
        date,
        description: "Ruba's Salary",
        amount: 4739,
        type: 'income'
      });
    });

    // Add regular monthly expenses
    mockTransactions.push({
      date: today.startOf('month').format('YYYY-MM-DD'),
      description: 'Monthly Rent',
      amount: 3750,
      type: 'expense'
    });

    mockTransactions.push({
      date: today.startOf('month').format('YYYY-MM-DD'),
      description: 'Utilities',
      amount: 250,
      type: 'expense'
    });

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
  );
}