import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { getCurrentDate } from '@/lib/utils';

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
  const today = useMemo(() => getCurrentDate(), []);
  const defaultDateRange = useMemo(() => ({
    from: today.toDate(),
    to: undefined
  }), [today]);

  const [date, setDate] = useState<DateRange | undefined>(defaultDateRange);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [remainingCalcs, setRemainingCalcs] = useState<RemainingCalculations | null>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setShowReport(false);
      setTransactions([]);
      setRemainingCalcs(null);
      setDate(defaultDateRange);
    }
  }, [isOpen, defaultDateRange]);

  // Handle date selection
  const handleDateSelect = (selectedDate: DateRange | undefined) => {
    if (selectedDate?.from && !selectedDate.to) {
      // If only start date is selected, automatically set end date to the same date
      setDate({
        from: selectedDate.from,
        to: selectedDate.from
      });
    } else {
      setDate(selectedDate);
    }
  };

  // Memoize the calculation function
  const calculateRemaining = useCallback((selectedDate: Date) => {
    const selectedDay = dayjs(selectedDate);

    const monthTransactions = transactions.filter(t => {
      const transDate = dayjs(t.date);
      return transDate.isSame(selectedDay, 'month');
    });

    // Calculate total monthly amounts
    const monthlyIncome = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate amounts up to selected date
    const incurredIncome = monthTransactions
      .filter(t => t.type === 'income' && dayjs(t.date).isSameOrBefore(selectedDay))
      .reduce((sum, t) => sum + t.amount, 0);

    const incurredExpenses = monthTransactions
      .filter(t => t.type === 'expense' && dayjs(t.date).isSameOrBefore(selectedDay))
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate remaining amounts
    const remainingIncome = monthlyIncome - incurredIncome;
    const remainingExpenses = monthlyExpenses - incurredExpenses;
    const remainingBalance = remainingIncome - remainingExpenses;

    setRemainingCalcs({
      remainingIncome,
      remainingExpenses,
      remainingBalance
    });
  }, [transactions]);

  // Generate transactions when date range changes
  useEffect(() => {
    if (!showReport || !date?.from || !date?.to) return;

    const startDate = dayjs(date.from);
    const endDate = dayjs(date.to);
    const generatedTransactions: Transaction[] = [];

    // Generate transactions for each person
    const generatePersonTransactions = (
      name: string,
      amount: number,
      dates: dayjs.Dayjs[]
    ) => {
      dates.forEach(payDate => {
        if (payDate.isBetween(startDate, endDate, 'day', '[]')) {
          generatedTransactions.push({
            date: payDate.format('YYYY-MM-DD'),
            description: `${name}'s Salary`,
            amount: amount,
            type: 'income',
            occurred: payDate.isSameOrBefore(today)
          });
        }
      });
    };

    // Generate Majdi's salary dates (1st and 15th of each month)
    const majdiPayDates = Array.from({ length: 12 }, (_, i) => {
      const month = startDate.add(i, 'month');
      return [month.date(1), month.date(15)];
    }).flat();
    generatePersonTransactions("Majdi", 4739, majdiPayDates);

    // Generate Ruba's salary dates (every 14 days)
    let rubaPayDate = dayjs('2025-01-10');
    const rubaDates: dayjs.Dayjs[] = [];
    while (rubaPayDate.isSameOrBefore(endDate)) {
      if (rubaPayDate.isBetween(startDate, endDate, 'day', '[]')) {
        rubaDates.push(rubaPayDate);
      }
      rubaPayDate = rubaPayDate.add(14, 'day');
    }
    generatePersonTransactions("Ruba", 2168, rubaDates);

    // Generate expense transactions
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
          generatedTransactions.push({
            date: expenseDate.format('YYYY-MM-DD'),
            description: expense.name,
            amount: expense.amount,
            type: 'expense',
            occurred: expenseDate.isSameOrBefore(today)
          });
        }
      });
      currentMonth = currentMonth.add(1, 'month');
    }

    setTransactions(generatedTransactions);
  }, [showReport, date?.from, date?.to, today]);

  // Calculate remaining amounts when transactions or selected date changes
  useEffect(() => {
    if (date?.from && transactions.length > 0) {
      calculateRemaining(date.from);
    }
  }, [date?.from, transactions, calculateRemaining]);

  const groupedTransactions = useMemo(() => {
    return transactions.reduce((groups: Record<string, Transaction[]>, transaction) => {
      const monthKey = dayjs(transaction.date).format('YYYY-MM');
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(transaction);
      return groups;
    }, {});
  }, [transactions]);

  const sortedMonths = useMemo(() => Object.keys(groupedTransactions).sort(), [groupedTransactions]);

  const summary = useMemo(() => transactions.reduce(
    (acc, transaction) => {
      const amount = transaction.amount;
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
  ), [transactions]);

  const occurredNet = useMemo(() => summary.occurredIncome - summary.occurredExpenses, [summary]);
  const futureNet = useMemo(() => summary.futureIncome - summary.futureExpenses, [summary]);

  if (!showReport) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Select Date Range</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <div className="border rounded-lg p-4 bg-background">
              <Calendar
                mode="range"
                selected={date}
                onSelect={handleDateSelect}
                numberOfMonths={1}
                defaultMonth={today.toDate()}
                className="rounded-md"
              />
            </div>
            {remainingCalcs && (
              <Card className="w-full mt-4">
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
            <div className="text-sm font-medium text-muted-foreground mt-4">
              {date?.from ? (
                <>
                  Selected Range: {dayjs(date.from).format('MMM D, YYYY')}
                  {date.to ? ` - ${dayjs(date.to).format('MMM D, YYYY')}` : ''}
                </>
              ) : (
                'Select start and end dates'
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDate(undefined);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-col space-y-2 sticky top-0 bg-background z-10">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl">
              Financial Report
            </DialogTitle>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowReport(false);
                setRemainingCalcs(null);
              }}
            >
              Back to Selection
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {dayjs(date?.from).format('MMM D, YYYY')} - {dayjs(date?.to).format('MMM D, YYYY')}
          </div>
        </DialogHeader>

        {/* Overall Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Occurred Transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <div className="text-sm text-muted-foreground">Income Received</div>
                <div className="text-xl font-bold text-green-600">{formatCurrency(summary.occurredIncome)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Expenses Paid</div>
                <div className="text-xl font-bold text-red-600">{formatCurrency(summary.occurredExpenses)}</div>
              </div>
              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground">Net Balance</div>
                <div className={`text-xl font-bold ${occurredNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(occurredNet)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Upcoming Transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <div className="text-sm text-muted-foreground">Expected Income</div>
                <div className="text-xl font-bold text-green-300">{formatCurrency(summary.futureIncome)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Pending Expenses</div>
                <div className="text-xl font-bold text-red-300">{formatCurrency(summary.futureExpenses)}</div>
              </div>
              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground">Expected Net</div>
                <div className={`text-xl font-bold ${futureNet >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {formatCurrency(futureNet)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Breakdown */}
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
                  <CardTitle className="text-lg font-medium flex justify-between items-center">
                    <span>{dayjs(monthKey).format('MMMM YYYY')}</span>
                    <span className={`text-base ${
                      monthlyTotal.income - monthlyTotal.expenses >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      Net: {formatCurrency(monthlyTotal.income - monthlyTotal.expenses)}
                    </span>
                  </CardTitle>
                  <div className="text-sm space-y-1">
                    <div className="text-green-600">
                      Income: {formatCurrency(monthlyTotal.income)}
                    </div>
                    <div className="text-red-600">
                      Expenses: {formatCurrency(monthlyTotal.expenses)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Income Transactions */}
                  {monthIncomes.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">Income</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">#</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthIncomes
                            .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
                            .map((transaction, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                                <TableCell>{transaction.description}</TableCell>
                                <TableCell className="text-right font-medium text-green-600">
                                  {formatCurrency(transaction.amount)}
                                </TableCell>
                                <TableCell>
                                  <span className={transaction.occurred ? "text-red-600" : "text-yellow-600"}>
                                    {transaction.occurred ? 'Received' : 'Expected'}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Expense Transactions */}
                  {monthExpenses.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Expenses</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">#</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthExpenses
                            .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
                            .map((transaction, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                                <TableCell>{transaction.description}</TableCell>
                                <TableCell className="text-right font-medium text-red-600">
                                  {formatCurrency(transaction.amount)}
                                </TableCell>
                                <TableCell>
                                  <span className={transaction.occurred ? "text-red-600" : "text-yellow-600"}>
                                    {transaction.occurred ? 'Paid' : 'Due'}
                                  </span>
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