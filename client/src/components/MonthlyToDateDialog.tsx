/**
 * ================================================
 * 📊 Monthly To Date Dialog Component
 * ================================================
 * Displays a detailed breakdown of income and expenses
 * for the current month up to the current date.
 * 
 * Features:
 * 📈 Income tracking
 * 📉 Expense monitoring
 * 💰 Balance calculation
 * 📅 Date-based filtering
 * 📱 Responsive design
 */

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

/**
 * 💳 Transaction Interface
 * Defines the structure for financial transactions
 */
interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

/**
 * 🎯 Component Props
 * Configuration options for the dialog
 */
interface MonthlyToDateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 📊 Monthly To Date Dialog Component
 * Renders a comprehensive view of monthly finances
 */
export default function MonthlyToDateDialog({ isOpen, onOpenChange }: MonthlyToDateDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const today = dayjs('2025-02-03'); // Current date from context
  const startOfMonth = today.startOf('month');
  const endOfMonth = today.endOf('month');

  useEffect(() => {
    if (!isOpen) return;

    const mockTransactions: Transaction[] = [];

    // Add Majdi's salary occurrences
    const majdiPayDates = ['01', '15'];
    majdiPayDates.forEach(day => {
      const payDate = today.format(`YYYY-MM-${day}`);
      if (dayjs(payDate).isSame(today, 'day') || dayjs(payDate).isBefore(today)) {
        mockTransactions.push({
          date: payDate,
          description: "Majdi's Salary",
          amount: Math.round(4739),
          type: 'income'
        });
      }
    });

    // Calculate Ruba's bi-weekly salary dates
    const rubaStartDate = dayjs('2025-01-10'); // First pay date
    let nextPayDate = rubaStartDate;

    while (nextPayDate.isBefore(today) || nextPayDate.isSame(today, 'day')) {
      if (nextPayDate.month() === today.month() && nextPayDate.date() <= today.date()) {
        mockTransactions.push({
          date: nextPayDate.format('YYYY-MM-DD'),
          description: "Ruba's Salary",
          amount: Math.round(2168),
          type: 'income'
        });
      }
      nextPayDate = nextPayDate.add(14, 'day');
    }

    // Add Monthly Expenses for February
    if (today.month() === 1) { // February is month 1 in zero-based months
      // February 1st expenses
      mockTransactions.push({
        date: startOfMonth.format('YYYY-MM-DD'),
        description: 'ATT Phone Bill',
        amount: 429,
        type: 'expense'
      });

      mockTransactions.push({
        date: startOfMonth.format('YYYY-MM-DD'),
        description: "Maid's 1st payment",
        amount: 120,
        type: 'expense'
      });

      mockTransactions.push({
        date: startOfMonth.format('YYYY-MM-DD'),
        description: 'Monthly Rent',
        amount: 3750,
        type: 'expense'
      });

      // February 3rd expenses
      if (today.date() >= 3) {
        mockTransactions.push({
          date: today.format('2025-02-03'),
          description: 'Sling TV',
          amount: 75,
          type: 'expense'
        });
      }
    }

    setTransactions(mockTransactions);
  }, [isOpen, today]);

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

  const netBalance = Math.round(totals.income - totals.expenses);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Monthly Report - {today.format('MMMM YYYY')} (Up to {today.format('MMMM D')})
          </DialogTitle>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
}