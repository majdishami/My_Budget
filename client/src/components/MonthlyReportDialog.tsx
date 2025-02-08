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
  const today = dayjs();
  const reportDate = today.format('MMMM D, YYYY');
  const currentYear = today.year();
  const currentMonth = today.month() + 1;

  useEffect(() => {
    if (!isOpen) return;

    const mockTransactions: Transaction[] = [];

    // Add Majdi's salary
    const majdiSalaryDates = ['01', '15'];
    majdiSalaryDates.forEach(day => {
      mockTransactions.push({
        date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${day}`,
        description: "Majdi's Salary",
        amount: 4739,
        type: 'income'
      });
    });

    // Add Ruba's bi-weekly salary
    const rubaPayDates = ['07', '21'];
    rubaPayDates.forEach(day => {
      mockTransactions.push({
        date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${day}`,
        description: "Ruba's Salary",
        amount: 2168,
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
        amount: expense.amount,
        type: 'expense'
      });
    });

    setTransactions(mockTransactions);
  }, [isOpen]);

  // Separate transactions into occurred and pending based on today's date
  const occurredIncomes = transactions
    .filter(t => t.type === 'income' && dayjs(t.date).isSameOrBefore(today))
    .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));

  const occurredExpenses = transactions
    .filter(t => t.type === 'expense' && dayjs(t.date).isSameOrBefore(today))
    .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));

  const pendingIncomes = transactions
    .filter(t => t.type === 'income' && dayjs(t.date).isAfter(today))
    .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));

  const pendingExpenses = transactions
    .filter(t => t.type === 'expense' && dayjs(t.date).isAfter(today))
    .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));

  // Calculate summaries
  const occurredIncomesTotal = occurredIncomes.reduce((sum, t) => sum + t.amount, 0);
  const occurredExpensesTotal = occurredExpenses.reduce((sum, t) => sum + t.amount, 0);
  const occurredBalance = occurredIncomesTotal - occurredExpensesTotal;

  const pendingIncomesTotal = pendingIncomes.reduce((sum, t) => sum + t.amount, 0);
  const pendingExpensesTotal = pendingExpenses.reduce((sum, t) => sum + t.amount, 0);
  const pendingBalance = pendingIncomesTotal - pendingExpensesTotal;

  const totalIncome = occurredIncomesTotal + pendingIncomesTotal;
  const totalExpenses = occurredExpensesTotal + pendingExpensesTotal;
  const totalBalance = totalIncome - totalExpenses;

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

        {/* Month-to-Date Section */}
        <div className="space-y-4 mb-8">
          <div className="border-b pb-2">
            <h3 className="text-lg font-semibold">Month-to-Date Summary (As of {reportDate})</h3>
            <div className="text-sm text-muted-foreground mt-1">
              Income: {formatCurrency(occurredIncomesTotal)} | 
              Expenses: {formatCurrency(occurredExpensesTotal)} | 
              Balance: <span className={occurredBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(occurredBalance)}
              </span>
            </div>
          </div>

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
                  {occurredIncomes.map((transaction, index) => (
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
                  {occurredExpenses.map((transaction, index) => (
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

        {/* Remaining Month Section */}
        <div className="space-y-4">
          <div className="border-b pb-2">
            <h3 className="text-lg font-semibold">Remaining Month Summary</h3>
            <div className="text-sm text-muted-foreground mt-1">
              Expected Income: {formatCurrency(pendingIncomesTotal)} | 
              Expected Expenses: {formatCurrency(pendingExpensesTotal)} | 
              Expected Balance: <span className={pendingBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(pendingBalance)}
              </span>
            </div>
          </div>

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
                  {pendingIncomes.map((transaction, index) => (
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
                  {pendingExpenses.map((transaction, index) => (
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

        {/* Monthly Total Summary */}
        <div className="mt-8 pt-4 border-t">
          <h3 className="text-lg font-semibold mb-2">Monthly Total Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm font-medium">Total Income:</span>
              <span className="text-green-600 ml-2">{formatCurrency(totalIncome)}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Total Expenses:</span>
              <span className="text-red-600 ml-2">{formatCurrency(totalExpenses)}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Net Balance:</span>
              <span className={`ml-2 ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalBalance)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}