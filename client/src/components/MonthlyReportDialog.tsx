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
import { X, Calendar, AlertCircle } from "lucide-react";

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
  const REFERENCE_DATE = dayjs('2025-02-08');

  useEffect(() => {
    if (!isOpen) return;

    // Generate all transactions for February
    const allTransactions: Transaction[] = [
      // Income transactions
      {
        date: '2025-02-01',
        description: "Majdi's Salary",
        amount: 4739,
        type: 'income'
      },
      {
        date: '2025-02-07',
        description: "Ruba's Salary",
        amount: 2168,
        type: 'income'
      },
      {
        date: '2025-02-15',
        description: "Majdi's Salary",
        amount: 4739,
        type: 'income'
      },
      {
        date: '2025-02-21',
        description: "Ruba's Salary",
        amount: 2168,
        type: 'income'
      },
      // Expense transactions
      {
        date: '2025-02-01',
        description: 'ATT Phone Bill',
        amount: 429,
        type: 'expense'
      },
      {
        date: '2025-02-01',
        description: "Maid's 1st payment",
        amount: 120,
        type: 'expense'
      },
      {
        date: '2025-02-01',
        description: 'Monthly Rent',
        amount: 3750,
        type: 'expense'
      },
      {
        date: '2025-02-03',
        description: 'Sling TV',
        amount: 75,
        type: 'expense'
      },
      {
        date: '2025-02-06',
        description: 'Cox Internet',
        amount: 81,
        type: 'expense'
      },
      {
        date: '2025-02-07',
        description: 'Water Bill',
        amount: 80,
        type: 'expense'
      },
      {
        date: '2025-02-07',
        description: 'NV Energy Electrical',
        amount: 250,
        type: 'expense'
      },
      {
        date: '2025-02-09',
        description: 'TransAmerica Life Insurance',
        amount: 77,
        type: 'expense'
      },
      {
        date: '2025-02-14',
        description: 'Credit Card minimum payments',
        amount: 225,
        type: 'expense'
      },
      {
        date: '2025-02-14',
        description: 'Apple/Google/YouTube',
        amount: 130,
        type: 'expense'
      },
      {
        date: '2025-02-16',
        description: 'Expenses & Groceries',
        amount: 3000,
        type: 'expense'
      },
      {
        date: '2025-02-17',
        description: "Maid's 2nd Payment",
        amount: 120,
        type: 'expense'
      },
      {
        date: '2025-02-17',
        description: 'SoFi Personal Loan',
        amount: 1915,
        type: 'expense'
      },
      {
        date: '2025-02-17',
        description: 'Southwest Gas',
        amount: 75,
        type: 'expense'
      },
      {
        date: '2025-02-28',
        description: 'Car Insurance for 3 cars',
        amount: 704,
        type: 'expense'
      }
    ];

    setTransactions(allTransactions);
  }, [isOpen]);

  // Split transactions into occurred and pending
  const occurred = transactions.filter(t => dayjs(t.date).isSameOrBefore(REFERENCE_DATE));
  const pending = transactions.filter(t => dayjs(t.date).isAfter(REFERENCE_DATE));

  // Calculate summaries
  const occurredIncomes = occurred.filter(t => t.type === 'income');
  const occurredExpenses = occurred.filter(t => t.type === 'expense');
  const occurredIncomesTotal = occurredIncomes.reduce((sum, t) => sum + t.amount, 0);
  const occurredExpensesTotal = occurredExpenses.reduce((sum, t) => sum + t.amount, 0);
  const occurredBalance = occurredIncomesTotal - occurredExpensesTotal;

  const pendingIncomes = pending.filter(t => t.type === 'income');
  const pendingExpenses = pending.filter(t => t.type === 'expense');
  const pendingIncomesTotal = pendingIncomes.reduce((sum, t) => sum + t.amount, 0);
  const pendingExpensesTotal = pendingExpenses.reduce((sum, t) => sum + t.amount, 0);
  const pendingBalance = pendingIncomesTotal - pendingExpensesTotal;

  const monthlyTotal = {
    income: occurredIncomesTotal + pendingIncomesTotal,
    expenses: occurredExpensesTotal + pendingExpensesTotal,
    balance: (occurredIncomesTotal + pendingIncomesTotal) - (occurredExpensesTotal + pendingExpensesTotal)
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              Monthly Report - February 2025
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-normal flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span>As of February 8, 2025</span>
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
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(occurredIncomesTotal + pendingIncomesTotal)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  <span className="text-green-600">✓ {formatCurrency(occurredIncomesTotal)}</span> occurred +{' '}
                  <span className="text-green-400">⌛ {formatCurrency(pendingIncomesTotal)}</span> pending
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(occurredExpensesTotal + pendingExpensesTotal)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  <span className="text-red-600">✓ {formatCurrency(occurredExpensesTotal)}</span> occurred +{' '}
                  <span className="text-red-400">⌛ {formatCurrency(pendingExpensesTotal)}</span> pending
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    <div className={`${monthlyTotal.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(monthlyTotal.balance)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span className={`${occurredBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        ✓ {formatCurrency(occurredBalance)}
                      </span> occurred +{' '}
                      <span className={`${pendingBalance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        ⌛ {formatCurrency(pendingBalance)}
                      </span> pending
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Expected month-end balance
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Occurred Transactions Section */}
          <div className="border rounded-lg p-4 bg-green-50/50 dark:bg-green-950/20">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
              Occurred Transactions (Through Feb 8)
            </h2>

            {/* Occurred Income */}
            {occurredIncomes.length > 0 && (
              <Card className="mb-4 border-green-200">
                <CardHeader className="py-4 bg-green-50/50">
                  <CardTitle className="text-sm font-medium text-green-700">Income Received</CardTitle>
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
                      {occurredIncomes.map((t, i) => (
                        <TableRow key={i}>
                          <TableCell>{dayjs(t.date).format('MMM D')}</TableCell>
                          <TableCell>{t.description}</TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            ✓ {formatCurrency(t.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Occurred Expenses */}
            {occurredExpenses.length > 0 && (
              <Card className="border-red-200">
                <CardHeader className="py-4 bg-red-50/50">
                  <CardTitle className="text-sm font-medium text-red-700">Expenses Paid</CardTitle>
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
                      {occurredExpenses.map((t, i) => (
                        <TableRow key={i}>
                          <TableCell>{dayjs(t.date).format('MMM D')}</TableCell>
                          <TableCell>{t.description}</TableCell>
                          <TableCell className="text-right text-red-600 font-medium">
                            ✓ {formatCurrency(t.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Pending Transactions Section */}
          <div className="border rounded-lg p-4 bg-yellow-50/50 dark:bg-yellow-950/20">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full"></span>
              Pending Transactions (After Feb 8)
            </h2>

            {/* Pending Income */}
            {pendingIncomes.length > 0 && (
              <Card className="mb-4 border-green-100">
                <CardHeader className="py-4 bg-green-50/30">
                  <CardTitle className="text-sm font-medium text-green-600">Expected Income</CardTitle>
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
                      {pendingIncomes.map((t, i) => (
                        <TableRow key={i}>
                          <TableCell>{dayjs(t.date).format('MMM D')}</TableCell>
                          <TableCell>{t.description}</TableCell>
                          <TableCell className="text-right text-green-400 font-medium">
                            ⌛ {formatCurrency(t.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Pending Expenses */}
            {pendingExpenses.length > 0 && (
              <Card className="border-red-100">
                <CardHeader className="py-4 bg-red-50/30">
                  <CardTitle className="text-sm font-medium text-red-600">Expected Expenses</CardTitle>
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
                      {pendingExpenses.map((t, i) => (
                        <TableRow key={i}>
                          <TableCell>{dayjs(t.date).format('MMM D')}</TableCell>
                          <TableCell>{t.description}</TableCell>
                          <TableCell className="text-right text-red-400 font-medium">
                            ⌛ {formatCurrency(t.amount)}
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
      </DialogContent>
    </Dialog>
  );
}