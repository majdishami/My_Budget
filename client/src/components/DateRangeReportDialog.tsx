import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
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
  occurred: boolean;
}

interface DateRangeReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DateRangeReportDialog({ isOpen, onOpenChange }: DateRangeReportDialogProps) {
  const [date, setDate] = useState<DateRange | undefined>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showReport, setShowReport] = useState(false);
  const today = dayjs('2025-02-04'); // Current date

  useEffect(() => {
    if (!isOpen) {
      setShowReport(false);
      setDate(undefined);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!showReport || !date?.from || !date?.to) return;

    const startDate = dayjs(date.from);
    const endDate = dayjs(date.to);
    const mockTransactions: Transaction[] = [];

    // Add Majdi's salary for the selected range
    const majdiPayDates = Array.from({ length: 12 }, (_, i) => {
      const month = startDate.add(i, 'month');
      return [
        month.date(1),  // 1st of month
        month.date(15), // 15th of month
      ];
    }).flat();

    majdiPayDates.forEach(payDate => {
      if (payDate.isBetween(startDate, endDate, 'day', '[]')) {
        mockTransactions.push({
          date: payDate.format('YYYY-MM-DD'),
          description: "Majdi's Salary",
          amount: Math.round(4739),
          type: 'income',
          occurred: payDate.isSameOrBefore(today)
        });
      }
    });

    // Add Ruba's bi-weekly salary
    let rubaPayDate = dayjs('2025-01-10');
    while (rubaPayDate.isSameOrBefore(endDate)) {
      if (rubaPayDate.isBetween(startDate, endDate, 'day', '[]')) {
        mockTransactions.push({
          date: rubaPayDate.format('YYYY-MM-DD'),
          description: "Ruba's Salary",
          amount: Math.round(2168),
          type: 'income',
          occurred: rubaPayDate.isSameOrBefore(today)
        });
      }
      rubaPayDate = rubaPayDate.add(14, 'day');
    }

    // Add monthly expenses for each month in the range
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

    let currentMonth = startDate.startOf('month');
    while (currentMonth.isSameOrBefore(endDate)) {
      monthlyExpenses.forEach(expense => {
        const expenseDate = currentMonth.date(expense.day);
        if (expenseDate.isBetween(startDate, endDate, 'day', '[]')) {
          mockTransactions.push({
            date: expenseDate.format('YYYY-MM-DD'),
            description: expense.name,
            amount: Math.round(expense.amount),
            type: 'expense',
            occurred: expenseDate.isSameOrBefore(today)
          });
        }
      });
      currentMonth = currentMonth.add(1, 'month');
    }

    setTransactions(mockTransactions);
  }, [showReport, date]);

  // Calculate summary totals
  const summary = transactions.reduce(
    (acc, transaction) => {
      const amount = Math.round(transaction.amount);
      if (transaction.type === 'income') {
        if (transaction.occurred) {
          acc.occurredIncome += amount;
        } else {
          acc.futureIncome += amount;
        }
      } else {
        if (transaction.occurred) {
          acc.occurredExpenses += amount;
        } else {
          acc.futureExpenses += amount;
        }
      }
      return acc;
    },
    { occurredIncome: 0, futureIncome: 0, occurredExpenses: 0, futureExpenses: 0 }
  );

  const occurredNet = summary.occurredIncome - summary.occurredExpenses;
  const futureNet = summary.futureIncome - summary.futureExpenses;

  if (!showReport) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Date Range</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <Calendar
              mode="range"
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
              className="rounded-md border"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => setShowReport(true)}
              disabled={!date?.from || !date?.to}
            >
              Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Financial Report: {dayjs(date?.from).format('MMM D, YYYY')} - {dayjs(date?.to).format('MMM D, YYYY')}
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-4">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Occurred Transactions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-green-600">
                  Income: {formatCurrency(summary.occurredIncome)}
                </div>
                <div className="text-red-600">
                  Expenses: {formatCurrency(summary.occurredExpenses)}
                </div>
                <div className={`font-bold ${occurredNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Net: {formatCurrency(occurredNet)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Future Transactions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-gray-500">
                  Income: {formatCurrency(summary.futureIncome)}
                </div>
                <div className="text-gray-500">
                  Expenses: {formatCurrency(summary.futureExpenses)}
                </div>
                <div className="text-gray-500 font-bold">
                  Net: {formatCurrency(futureNet)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions
                  .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
                  .map((transaction, index) => {
                    const textColor = transaction.occurred
                      ? transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      : 'text-gray-500';

                    return (
                      <TableRow key={index}>
                        <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className={`text-right ${textColor}`}>
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell className={textColor}>
                          {transaction.occurred ? 'Occurred' : 'Pending'}
                        </TableCell>
                      </TableRow>
                    )}
                  )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
