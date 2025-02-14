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
import { useQuery } from "@tanstack/react-query";
import * as Icons from 'lucide-react';

// DynamicIcon component that uses Lucide icons
const DynamicIcon = ({ iconName }: { iconName: string | null | undefined }) => {
  if (!iconName) return null;

  // Convert icon name to match Lucide naming convention (e.g., "shopping-cart" to "ShoppingCart")
  const formatIconName = (name: string) => {
    return name.split('-').map(part =>
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ).join('');
  };

  const IconComponent = (Icons as any)[formatIconName(iconName)];
  return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
};

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category_name: string;
  category_color: string;
  category_icon: string | null;
}

interface MonthlyReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MonthlyReportDialog({ isOpen, onOpenChange }: MonthlyReportDialogProps) {
  const today = getCurrentDate();
  const firstDayOfMonth = today.startOf('month').format('YYYY-MM-DD');
  const lastDayOfMonth = today.endOf('month').format('YYYY-MM-DD');

  // Fetch transactions from the database
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
    enabled: isOpen,
    staleTime: 0, // Always consider data stale
    cacheTime: 0, // Don't cache the data
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Filter transactions for the current month
  const monthlyTransactions = transactions.filter(t => {
    const transactionDate = dayjs(t.date);
    return transactionDate.isSameOrAfter(firstDayOfMonth) && transactionDate.isSameOrBefore(lastDayOfMonth);
  });

  // Split transactions into occurred and pending based on today's date
  const occurred = monthlyTransactions.filter(t => dayjs(t.date).isSameOrBefore(today));
  const pending = monthlyTransactions.filter(t => dayjs(t.date).isAfter(today));

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
    balance: occurredBalance + pendingBalance
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
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
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(monthlyTotal.income)}
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
                  {formatCurrency(monthlyTotal.expenses)}
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
              Occurred Transactions (Through {today.format('MMM D')})
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
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {occurredIncomes.map((t, i) => (
                        <TableRow key={i}>
                          <TableCell>{dayjs(t.date).format('MMM D')}</TableCell>
                          <TableCell>{t.description}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: t.category_color }}
                              />
                              {t.category_icon && <DynamicIcon iconName={t.category_icon} />}
                              <span>{t.category_name}</span>
                            </div>
                          </TableCell>
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
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {occurredExpenses.map((t, i) => (
                        <TableRow key={i}>
                          <TableCell>{dayjs(t.date).format('MMM D')}</TableCell>
                          <TableCell>{t.description}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: t.category_color }}
                              />
                              {t.category_icon && <DynamicIcon iconName={t.category_icon} />}
                              <span>{t.category_name}</span>
                            </div>
                          </TableCell>
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
              Pending Transactions (After {today.format('MMM D')})
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
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingIncomes.map((t, i) => (
                        <TableRow key={i}>
                          <TableCell>{dayjs(t.date).format('MMM D')}</TableCell>
                          <TableCell>{t.description}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: t.category_color }}
                              />
                              {t.category_icon && <DynamicIcon iconName={t.category_icon} />}
                              <span>{t.category_name}</span>
                            </div>
                          </TableCell>
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
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingExpenses.map((t, i) => (
                        <TableRow key={i}>
                          <TableCell>{dayjs(t.date).format('MMM D')}</TableCell>
                          <TableCell>{t.description}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: t.category_color }}
                              />
                              {t.category_icon && <DynamicIcon iconName={t.category_icon} />}
                              <span>{t.category_name}</span>
                            </div>
                          </TableCell>
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