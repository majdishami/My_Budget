import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

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

interface RemainingCalculations {
  remainingIncome: number;
  remainingExpenses: number;
  remainingBalance: number;
}

export default function DateRangeReportDialog({ isOpen, onOpenChange }: DateRangeReportDialogProps) {
  const today = dayjs('2025-02-08');
  const defaultDateRange = {
    from: today.toDate(),
    to: undefined
  };

  const [date, setDate] = useState<DateRange | undefined>(defaultDateRange);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [remainingCalcs, setRemainingCalcs] = useState<RemainingCalculations | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setShowReport(false);
      setTransactions([]);
      if (date?.from !== defaultDateRange.from || date?.to !== defaultDateRange.to) {
        setDate(defaultDateRange);
      }
    }
  }, [isOpen, defaultDateRange]);

  useEffect(() => {
    if (!showReport || !date?.from || !date?.to) return;

    const startDate = dayjs(date.from);
    const endDate = dayjs(date.to);
    const mockTransactions: Transaction[] = [];

    const majdiPayDates = Array.from({ length: 12 }, (_, i) => {
      const month = startDate.add(i, 'month');
      return [
        month.date(1),
        month.date(15),
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
    // Only calculate remaining if we have a from date
    if (date?.from) {
      calculateRemaining(date?.from);
    }
  }, [showReport, date?.from, date?.to]); // Add proper dependencies

  // Memoize the calculation function to prevent unnecessary recalculations
  const calculateRemaining = useCallback((selectedDate: Date) => {
    const selectedDay = dayjs(selectedDate);

    const monthTransactions = transactions.filter(t => {
      const transDate = dayjs(t.date);
      return transDate.isSame(selectedDay, 'month');
    });

    const monthlyIncome = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const incurredIncome = monthTransactions
      .filter(t => t.type === 'income' && dayjs(t.date).isSameOrBefore(selectedDay))
      .reduce((sum, t) => sum + t.amount, 0);

    const incurredExpenses = monthTransactions
      .filter(t => t.type === 'expense' && dayjs(t.date).isSameOrBefore(selectedDay))
      .reduce((sum, t) => sum + t.amount, 0);

    const remainingIncome = monthlyIncome - incurredIncome;
    const remainingExpenses = monthlyExpenses - incurredExpenses;
    const remainingBalance = remainingIncome - remainingExpenses;

    setRemainingCalcs({
      remainingIncome,
      remainingExpenses,
      remainingBalance
    });
  }, [transactions]); // Add transactions as dependency

  const groupedTransactions = transactions.reduce((groups: Record<string, Transaction[]>, transaction) => {
    const monthKey = dayjs(transaction.date).format('YYYY-MM');
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(transaction);
    return groups;
  }, {});

  const sortedMonths = Object.keys(groupedTransactions).sort();

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
        <DialogContent className="sm:max-w-[400px]" aria-describedby="date-range-description">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Select Date Range</DialogTitle>
          </DialogHeader>
          <div id="date-range-description" className="flex flex-col items-center space-y-4 py-4">
            <div className="border rounded-lg p-4 bg-background">
              <Calendar
                mode="range"
                selected={date}
                onSelect={(newDate) => {
                  setDate(newDate);
                  // Only calculate if we have a from date
                  if (newDate?.from) {
                    calculateRemaining(newDate.from);
                  } else {
                    setRemainingCalcs(null);
                  }
                }}
                numberOfMonths={1}
                defaultMonth={today.toDate()}
                className="rounded-md"
              />
            </div>
            {remainingCalcs && (
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Remaining Till End Of Month
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-green-600">
                    Remaining Income: {formatCurrency(remainingCalcs.remainingIncome)}
                  </div>
                  <div className="text-red-600">
                    Remaining Expenses: {formatCurrency(remainingCalcs.remainingExpenses)}
                  </div>
                  <div className={`font-bold ${remainingCalcs.remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Balance of Remaining: {formatCurrency(remainingCalcs.remainingBalance)}
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="text-sm text-muted-foreground">
              {date?.from ? (
                <>
                  {dayjs(date.from).format('MMM D, YYYY')}
                  {date.to ? ` - ${dayjs(date.to).format('MMM D, YYYY')}` : ''}
                </>
              ) : (
                'Select start and end dates'
              )}
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDate(defaultDateRange);
                onOpenChange(false);
              }}
            >
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="report-content-description">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Financial Report: {dayjs(date?.from).format('MMM D, YYYY')} - {dayjs(date?.to).format('MMM D, YYYY')}
          </DialogTitle>
        </DialogHeader>
        <div id="report-content-description" className="sr-only">
          Financial report showing income and expenses between selected dates
        </div>

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
                <div className="text-green-300">
                  Income: {formatCurrency(summary.futureIncome)}
                </div>
                <div className="text-red-300">
                  Expenses: {formatCurrency(summary.futureExpenses)}
                </div>
                <div className={`font-bold ${futureNet >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  Net: {formatCurrency(futureNet)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          {sortedMonths.map(monthKey => {
            const monthTransactions = groupedTransactions[monthKey];
            const monthIncomes = monthTransactions.filter(t => t.type === 'income');
            const monthExpenses = monthTransactions.filter(t => t.type === 'expense');

            const monthlyTotal = {
              income: monthIncomes.reduce((sum, t) => sum + t.amount, 0),
              expenses: monthExpenses.reduce((sum, t) => sum + t.amount, 0)
            };

            return (
              <Card key={monthKey}>
                <CardHeader className="py-4">
                  <CardTitle className="text-lg font-medium">
                    {dayjs(monthKey).format('MMMM YYYY')}
                  </CardTitle>
                  <div className="text-sm space-y-1">
                    <div className="text-green-600">
                      Monthly Income: {formatCurrency(monthlyTotal.income)}
                    </div>
                    <div className="text-red-600">
                      Monthly Expenses: {formatCurrency(monthlyTotal.expenses)}
                    </div>
                    <div className={`font-medium ${monthlyTotal.income - monthlyTotal.expenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Monthly Net: {formatCurrency(monthlyTotal.income - monthlyTotal.expenses)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {monthIncomes.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">Income</h4>
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
                          {monthIncomes
                            .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
                            .map((transaction, index) => (
                              <TableRow key={index}>
                                <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                                <TableCell>{transaction.description}</TableCell>
                                <TableCell className={`text-right ${transaction.occurred ? 'text-green-600' : 'text-green-300'}`}>
                                  {formatCurrency(transaction.amount)}
                                </TableCell>
                                <TableCell className={transaction.occurred ? 'text-green-600' : 'text-green-300'}>
                                  {transaction.occurred ? 'Occurred' : 'Pending'}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {monthExpenses.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Expenses</h4>
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
                          {monthExpenses
                            .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
                            .map((transaction, index) => (
                              <TableRow key={index}>
                                <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                                <TableCell>{transaction.description}</TableCell>
                                <TableCell className={`text-right ${transaction.occurred ? 'text-red-600' : 'text-red-300'}`}>
                                  {formatCurrency(transaction.amount)}
                                </TableCell>
                                <TableCell className={transaction.occurred ? 'text-red-600' : 'text-red-300'}>
                                  {transaction.occurred ? 'Occurred' : 'Pending'}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}