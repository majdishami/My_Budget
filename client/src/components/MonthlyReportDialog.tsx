import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
  const FIXED_DATE = '2025-02-08';
  const today = dayjs(FIXED_DATE);

  useEffect(() => {
    if (!isOpen) return;

    const mockTransactions: Transaction[] = [];

    // Add Majdi's salary for February
    if (today.date() >= 1) {
      mockTransactions.push({
        date: '2025-02-01',
        description: "Majdi's Salary",
        amount: 4739,
        type: 'income'
      });
    }
    if (today.date() >= 15) {
      mockTransactions.push({
        date: '2025-02-15',
        description: "Majdi's Salary",
        amount: 4739,
        type: 'income'
      });
    }

    // Add Ruba's bi-weekly salary for February
    if (today.date() >= 7) {
      mockTransactions.push({
        date: '2025-02-07',
        description: "Ruba's Salary",
        amount: 2168,
        type: 'income'
      });
    }
    if (today.date() >= 21) {
      mockTransactions.push({
        date: '2025-02-21',
        description: "Ruba's Salary",
        amount: 2168,
        type: 'income'
      });
    }

    // Add February expenses with dates
    const expenses = [
      { date: '01', name: 'ATT Phone Bill', amount: 429 },
      { date: '01', name: "Maid's 1st payment", amount: 120 },
      { date: '01', name: 'Monthly Rent', amount: 3750 },
      { date: '03', name: 'Sling TV', amount: 75 },
      { date: '06', name: 'Cox Internet', amount: 81 },
      { date: '07', name: 'Water Bill', amount: 80 },
      { date: '07', name: 'NV Energy Electrical', amount: 250 },
      { date: '09', name: 'TransAmerica Life Insurance', amount: 77 },
      { date: '14', name: 'Credit Card minimum payments', amount: 225 },
      { date: '14', name: 'Apple/Google/YouTube', amount: 130 },
      { date: '16', name: 'Expenses & Groceries', amount: 3000 },
      { date: '17', name: "Maid's 2nd Payment", amount: 120 },
      { date: '17', name: 'SoFi Personal Loan', amount: 1915 },
      { date: '17', name: 'Southwest Gas', amount: 75 },
      { date: '28', name: 'Car Insurance for 3 cars', amount: 704 }
    ];

    // Only add expenses that have occurred before or on the current date
    expenses.forEach(expense => {
      const expenseDate = parseInt(expense.date);
      if (expenseDate <= today.date()) {
        mockTransactions.push({
          date: `2025-02-${expense.date}`,
          description: expense.name,
          amount: expense.amount,
          type: 'expense'
        });
      }
    });

    setTransactions(mockTransactions);
  }, [isOpen, today]);

  // Filter transactions based on the current date (Feb 8)
  const occurredTransactions = transactions.filter(t => 
    dayjs(t.date).isSameOrBefore(today)
  );

  const pendingTransactions = transactions.filter(t => 
    dayjs(t.date).isAfter(today)
  );

  // Calculate summaries
  const occurredIncomes = occurredTransactions.filter(t => t.type === 'income');
  const occurredExpenses = occurredTransactions.filter(t => t.type === 'expense');
  const occurredIncomesTotal = occurredIncomes.reduce((sum, t) => sum + t.amount, 0);
  const occurredExpensesTotal = occurredExpenses.reduce((sum, t) => sum + t.amount, 0);
  const occurredBalance = occurredIncomesTotal - occurredExpensesTotal;

  const pendingIncomes = pendingTransactions.filter(t => t.type === 'income');
  const pendingExpenses = pendingTransactions.filter(t => t.type === 'expense');
  const pendingIncomesTotal = pendingIncomes.reduce((sum, t) => sum + t.amount, 0);
  const pendingExpensesTotal = pendingExpenses.reduce((sum, t) => sum + t.amount, 0);
  const pendingBalance = pendingIncomesTotal - pendingExpensesTotal;

  const totalIncome = occurredIncomesTotal + pendingIncomesTotal;
  const totalExpenses = occurredExpensesTotal + pendingExpensesTotal;
  const monthlyBalance = totalIncome - totalExpenses;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            Monthly Report - February 2025
            <div className="flex items-center gap-2">
              <div className="text-sm font-normal text-muted-foreground">
                Report as of Feb 8, 2025
              </div>
              <DialogClose className="rounded-sm opacity-70 hover:opacity-100">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Month-to-Date Section */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold mb-4">Transactions Up To Feb 8</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Income Received</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(occurredIncomesTotal)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Expenses Paid</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(occurredExpensesTotal)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${occurredBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(occurredBalance)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Occurred Transactions Tables */}
            <div className="space-y-4">
              {occurredIncomes.length > 0 && (
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
                        {occurredIncomes.map((transaction, index) => (
                          <TableRow key={index}>
                            <TableCell>{dayjs(transaction.date).format('MMM D')}</TableCell>
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
              )}

              {occurredExpenses.length > 0 && (
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
                        {occurredExpenses.map((transaction, index) => (
                          <TableRow key={index}>
                            <TableCell>{dayjs(transaction.date).format('MMM D')}</TableCell>
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
              )}
            </div>
          </div>

          {/* Remaining Month Section */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold mb-4">Remaining Transactions (After Feb 8)</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Expected Income</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(pendingIncomesTotal)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Expected Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(pendingExpensesTotal)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Expected Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${pendingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(pendingBalance)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Transactions Tables */}
            <div className="space-y-4">
              {pendingIncomes.length > 0 && (
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
                        {pendingIncomes.map((transaction, index) => (
                          <TableRow key={index}>
                            <TableCell>{dayjs(transaction.date).format('MMM D')}</TableCell>
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
              )}

              {pendingExpenses.length > 0 && (
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium">Expected Expenses</CardTitle>
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
                        {pendingExpenses.map((transaction, index) => (
                          <TableRow key={index}>
                            <TableCell>{dayjs(transaction.date).format('MMM D')}</TableCell>
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
              )}
            </div>
          </div>

          {/* Monthly Total Summary */}
          <div className="pt-4">
            <h2 className="text-lg font-semibold mb-4">Monthly Total Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalIncome)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(totalExpenses)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Monthly Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${monthlyBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(monthlyBalance)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}