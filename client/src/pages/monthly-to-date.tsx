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
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentDate } from '@/lib/utils';

interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

export default function MonthlyToDateReport() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the current date utility
  const today = getCurrentDate();
  const startOfMonth = today.startOf('month');
  const endOfMonth = today.endOf('month');
  const [, setLocation] = useLocation();

  useEffect(() => {
    try {
      setIsLoading(true);
      setError(null);
      const mockTransactions: Transaction[] = [];

      // Add Majdi's salary occurrences
      const majdiPayDates = ['01', '15'];
      majdiPayDates.forEach(day => {
        const payDate = today.format(`YYYY-MM-${day}`);
        if (dayjs(payDate).isSameOrBefore(today)) {
          mockTransactions.push({
            date: payDate,
            description: "Majdi's Salary",
            amount: 4739,
            type: 'income'
          });
        }
      });

      // Add Ruba's salary for February 7th
      if (today.date() >= 7) {
        mockTransactions.push({
          date: today.date(7).format('YYYY-MM-DD'),
          description: "Ruba's Salary",
          amount: 2168,
          type: 'income'
        });
      }

      // Add Monthly Expenses for February
      const monthlyExpenses = [
        { description: 'ATT Phone Bill', amount: 429, date: 1 },
        { description: "Maid's 1st payment", amount: 120, date: 1 },
        { description: 'Monthly Rent', amount: 3750, date: 1 },
        { description: 'Sling TV', amount: 75, date: 3 },
        { description: 'Cox Internet', amount: 81, date: 6 },
        { description: 'Water Bill', amount: 80, date: 7 },
        { description: 'NV Energy Electrical', amount: 250, date: 7 },
        { description: 'TransAmerica Life Insurance', amount: 77, date: 9 },
        { description: 'Credit Card minimum payments', amount: 225, date: 14 },
        { description: 'Apple/Google/YouTube', amount: 130, date: 14 },
        { description: 'Expenses & Groceries', amount: 3000, date: 16 },
        { description: "Maid's 2nd Payment", amount: 120, date: 17 },
        { description: 'SoFi Personal Loan', amount: 1915, date: 17 },
        { description: 'Southwest Gas', amount: 75, date: 17 },
        { description: 'Car Insurance for 3 cars', amount: 704, date: 28 }
      ];

      monthlyExpenses.forEach(expense => {
        if (today.date() >= expense.date) {
          mockTransactions.push({
            date: today.date(expense.date).format('YYYY-MM-DD'),
            description: expense.description,
            amount: expense.amount,
            type: 'expense'
          });
        }
      });

      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Error generating transactions:', error);
      setError('Failed to generate transactions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [today]);

  // Calculate totals for occurred transactions
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

  // Calculate monthly expected totals
  const monthlyExpectedTotals = {
    income: 13814, // Majdi's salary (4739 * 2) + Ruba's salary (2168 * 2)
    expenses: 11031, // Sum of all monthly expenses calculated from the monthlyExpenses array
  };

  // Calculate remaining amounts
  const remaining = {
    income: monthlyExpectedTotals.income - totals.income,
    expenses: monthlyExpectedTotals.expenses - totals.expenses,
    balance: (monthlyExpectedTotals.income - totals.income) - (monthlyExpectedTotals.expenses - totals.expenses)
  };

  const netBalance = totals.income - totals.expenses;

  if (error) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="bg-red-50 text-red-800 p-4 rounded-md">
          <p>{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

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
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="py-4">
                  <Skeleton className="h-4 w-[150px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-[120px]" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Total Occurred Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totals.income)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Total Incurred Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(totals.expenses)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Net Balance up to date</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(netBalance)}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Remaining Amounts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-muted/50">
                <CardHeader className="py-4">
                  <Skeleton className="h-4 w-[150px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-[120px]" />
                  <Skeleton className="h-4 w-[100px] mt-2" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card className="bg-muted/50">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Remaining Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">
                  {formatCurrency(remaining.income)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Expected: {formatCurrency(monthlyExpectedTotals.income)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Remaining Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-400">
                  {formatCurrency(remaining.expenses)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Expected: {formatCurrency(monthlyExpectedTotals.expenses)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${remaining.balance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {formatCurrency(remaining.balance)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Future net balance
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <>
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader className="py-4">
                  <Skeleton className="h-4 w-[150px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}