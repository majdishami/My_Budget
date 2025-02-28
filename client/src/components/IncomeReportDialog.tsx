import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Types and Utils
import { DateRange } from "react-day-picker";
import { Income } from "@/types";
import { formatCurrency, getCurrentDate } from '@/lib/utils';

// Initialize dayjs plugins
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

interface Transaction {
  date: string;
  description: string;
  amount: number;
  occurred: boolean;
}

interface IncomeReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  incomes: Income[];
}

interface IncomeSummary {
  name: string;
  occurred: number;
  pending: number;
  total: number;
}

export default function IncomeReportDialog({ isOpen, onOpenChange, incomes }: IncomeReportDialogProps) {
  const today = useMemo(() => getCurrentDate(), []); 
  const [date, setDate] = useState<DateRange | undefined>({
    from: today.toDate(),
    to: undefined
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [summaryTotals, setSummaryTotals] = useState({
    occurred: 0,
    pending: 0
  });
  const [individualSummaries, setIndividualSummaries] = useState<IncomeSummary[]>([]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setDate({
        from: today.toDate(),
        to: undefined
      });
      setShowReport(false);
      setTransactions([]);
      setSummaryTotals({ occurred: 0, pending: 0 });
      setIndividualSummaries([]);
    }
  }, [isOpen, today]);

  // Generate transactions when date range is selected
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

    setTransactions(generatedTransactions);
  }, [showReport, date?.from, date?.to, today]);

  // Calculate totals and individual summaries
  useEffect(() => {
    if (!date?.from || !date?.to) return;

    const filtered = transactions.filter(t => {
      const transactionDate = dayjs(t.date);
      return transactionDate.isSameOrAfter(dayjs(date.from)) && 
             transactionDate.isSameOrBefore(dayjs(date.to));
    });

    // Calculate overall totals
    const totals = filtered.reduce(
      (acc, transaction) => {
        if (transaction.occurred) {
          acc.occurred += transaction.amount;
        } else {
          acc.pending += transaction.amount;
        }
        return acc;
      },
      { occurred: 0, pending: 0 }
    );
    setSummaryTotals(totals);

    // Calculate individual summaries
    const summaries = ['Majdi', 'Ruba'].map(name => {
      const personTransactions = filtered.filter(t => t.description === `${name}'s Salary`);
      return {
        name,
        occurred: personTransactions.filter(t => t.occurred).reduce((sum, t) => sum + t.amount, 0),
        pending: personTransactions.filter(t => !t.occurred).reduce((sum, t) => sum + t.amount, 0),
        total: personTransactions.reduce((sum, t) => sum + t.amount, 0)
      };
    });
    setIndividualSummaries(summaries);
  }, [transactions, date]);

  if (!showReport) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Select Date Range</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="border rounded-lg p-4 bg-background">
              <Calendar
                mode="range"
                selected={date}
                onSelect={setDate}
                numberOfMonths={1}
                defaultMonth={today.toDate()}
                className="rounded-md"
              />
            </div>
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
        <DialogHeader>
          <DialogTitle className="text-xl">
            Income Report
            <div className="text-sm font-normal text-muted-foreground mt-1">
              {dayjs(date?.from).format('MMM D, YYYY')} - {dayjs(date?.to).format('MMM D, YYYY')}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Overall Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="text-sm text-muted-foreground">Total Income</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(summaryTotals.occurred + summaryTotals.pending)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Received</div>
                    <div className="text-xl font-bold text-red-600">{formatCurrency(summaryTotals.occurred)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                    <div className="text-xl font-bold text-yellow-600">{formatCurrency(summaryTotals.pending)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Individual Summaries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {individualSummaries.map((summary) => (
                  <div key={summary.name} className="space-y-2">
                    <div className="text-sm font-medium">{summary.name}'s Income</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="text-sm font-bold text-green-600">{formatCurrency(summary.total)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Received</div>
                        <div className="text-sm font-bold text-red-600">{formatCurrency(summary.occurred)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Pending</div>
                        <div className="text-sm font-bold text-yellow-600">{formatCurrency(summary.pending)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4">
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
              {transactions
                .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
                .map((transaction, index) => (
                  <TableRow key={`${transaction.date}-${index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                    <TableCell className="text-green-600">
                      {transaction.description}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(transaction.amount)}</TableCell>
                    <TableCell>
                      <span className={transaction.occurred ? "text-red-600" : "text-yellow-600"}>
                        {transaction.occurred ? 'Received' : 'Pending'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Income, DateRange } from "@/types";
import dayjs from "dayjs";
import { Card } from "@/components/ui/card";

export interface IncomeReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  incomes: Income[];
  dateRange?: DateRange;
}

export function IncomeReportDialog({
  isOpen,
  onOpenChange,
  incomes,
  dateRange
}: IncomeReportDialogProps) {
  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  
  const formatDate = (date: string) => {
    return dayjs(date).format('YYYY-MM-DD');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getDateRangeText = () => {
    if (!dateRange || !dateRange.from || !dateRange.to) return "All Time";
    return `${dayjs(dateRange.from).format('MMM D, YYYY')} - ${dayjs(dateRange.to).format('MMM D, YYYY')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Income Report</DialogTitle>
          <DialogDescription>
            Income report for {getDateRangeText()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Card className="p-4 mb-4">
            <h2 className="text-xl font-semibold mb-2">Summary</h2>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
            <p className="text-sm text-gray-500">Total Income</p>
          </Card>
          
          <h2 className="text-xl font-semibold mb-2">Income Details</h2>
          {incomes.length === 0 ? (
            <p className="text-gray-500">No income data available for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {incomes.map((income) => (
                    <tr key={income.id} className="border-t">
                      <td className="p-2">{formatDate(income.date)}</td>
                      <td className="p-2">{income.description}</td>
                      <td className="p-2 text-right font-semibold text-green-600">
                        {formatCurrency(income.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default IncomeReportDialog;
