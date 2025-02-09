import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X } from 'lucide-react';

dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

interface Transaction {
  date: string;
  description: string;
  amount: number;
  occurred: boolean;
  category?: string;
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  day: number;
  category?: string;
}

interface ExpenseReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bills: Bill[];
}

export default function ExpenseReportDialog({ isOpen, onOpenChange, bills }: ExpenseReportDialogProps) {
  // State for selected expense/category and filter type
  const [selectedValue, setSelectedValue] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>();
  const [showReport, setShowReport] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const today = useMemo(() => dayjs(), []);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedValue("all");
      setDate(undefined);
      setShowReport(false);
      setDateError(null);
    }
  }, [isOpen]);

  // Group bills by category and prepare dropdown options
  const dropdownOptions = useMemo(() => {
    const categorizedBills = bills.reduce((acc, bill) => {
      const category = bill.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(bill);
      return acc;
    }, {} as Record<string, Bill[]>);

    return {
      categories: Object.keys(categorizedBills).sort(),
      categorizedBills
    };
  }, [bills]);

  // Generate transactions based on selection
  const transactions = useMemo(() => {
    if (!showReport || !date?.from || !date?.to) return [];

    // Validate date range
    if (dayjs(date.to).isBefore(date.from)) {
      setDate({
        from: date.from,
        to: date.from
      });
      setDateError("End date cannot be before start date");
      return [];
    }

    setDateError(null);
    let filteredBills = bills;

    // Filter based on selection
    if (selectedValue !== "all") {
      if (selectedValue.startsWith('expense_')) {
        // Individual expense selected
        const expenseId = selectedValue.replace('expense_', '');
        filteredBills = bills.filter(bill => bill.id === expenseId);
      } else {
        // Category selected
        filteredBills = bills.filter(bill => (bill.category || 'Uncategorized') === selectedValue);
      }
    }

    const startDate = dayjs(date.from);
    const endDate = dayjs(date.to);
    const result: Transaction[] = [];

    // Generate transactions for each bill
    filteredBills.forEach(bill => {
      let currentMonth = startDate.startOf('month');
      while (currentMonth.isSameOrBefore(endDate)) {
        const transactionDate = currentMonth.date(bill.day);
        if (transactionDate.isBetween(startDate, endDate, 'day', '[]')) {
          result.push({
            date: transactionDate.format('YYYY-MM-DD'),
            description: bill.name,
            amount: bill.amount,
            occurred: transactionDate.isSameOrBefore(today),
            category: bill.category || 'Uncategorized'  // Ensure we pass the category from the bill
          });
        }
        currentMonth = currentMonth.add(1, 'month');
      }
    });

    return result.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
  }, [showReport, selectedValue, date, bills, today]);

  // Calculate summary totals
  const summary = useMemo(() => {
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const occurredAmount = transactions
      .filter(t => t.occurred)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalAmount,
      occurredAmount,
      pendingAmount: totalAmount - occurredAmount
    };
  }, [transactions]);

  // Group transactions by month
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

  // Get sorted month keys
  const sortedMonths = useMemo(() =>
    Object.keys(groupedTransactions).sort((a, b) => dayjs(a).diff(dayjs(b))),
    [groupedTransactions]
  );

  if (!showReport) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Generate Expense Report
            </DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          <div className="flex flex-col space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Expense or Category</label>
              <Select value={selectedValue} onValueChange={setSelectedValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Expenses</SelectItem>
                  {dropdownOptions.categories.map((category) => (
                    <SelectGroup key={category}>
                      <SelectLabel>{category}</SelectLabel>
                      {/* Category option */}
                      <SelectItem value={category}>
                        View All {category} Expenses
                      </SelectItem>
                      {/* Individual expenses in this category */}
                      {dropdownOptions.categorizedBills[category].map((bill) => (
                        <SelectItem key={bill.id} value={`expense_${bill.id}`}>
                          {bill.name} ({formatCurrency(bill.amount)})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-4 bg-background">
              <Calendar
                mode="range"
                selected={date}
                onSelect={(newDate) => {
                  setDate(newDate);
                  setDateError(null);
                }}
                numberOfMonths={1}
                defaultMonth={today.toDate()}
                className="rounded-md"
              />
            </div>

            {dateError && (
              <div className="text-sm text-red-500">
                {dateError}
              </div>
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => setShowReport(true)}
              disabled={!date?.from || !date?.to || !!dateError}
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
            {selectedValue === "all"
              ? "All Expenses"
              : selectedValue.startsWith('expense_')
                ? bills.find(b => b.id === selectedValue.replace('expense_', ''))?.name || "Expense Report"
                : `${selectedValue} Expenses`
            }
            <div className="text-sm font-normal text-muted-foreground mt-1">
              {date?.from && date?.to && `${dayjs(date?.from).format('MMM D, YYYY')} - ${dayjs(date?.to).format('MMM D, YYYY')}`}
            </div>
          </DialogTitle>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        {transactions.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No transactions found for the selected date range.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(summary.totalAmount)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Paid to Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(summary.occurredAmount)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-300">
                    {formatCurrency(summary.pendingAmount)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {sortedMonths.map(monthKey => {
                const monthTransactions = groupedTransactions[monthKey];
                const monthlyTotal = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
                const monthlyPaid = monthTransactions
                  .filter(t => t.occurred)
                  .reduce((sum, t) => sum + t.amount, 0);

                return (
                  <Card key={monthKey}>
                    <CardHeader className="py-4">
                      <CardTitle className="text-lg font-medium">
                        {dayjs(monthKey).format('MMMM YYYY')}
                      </CardTitle>
                      <div className="text-sm space-y-1">
                        <div className="text-red-600">
                          Monthly Total: {formatCurrency(monthlyTotal)}
                        </div>
                        <div className="text-red-600">
                          Paid to Date: {formatCurrency(monthlyPaid)}
                        </div>
                        <div className="text-red-300">
                          Remaining: {formatCurrency(monthlyTotal - monthlyPaid)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthTransactions
                            .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
                            .map((transaction, index) => (
                              <TableRow key={index}>
                                <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                                <TableCell>{transaction.description}</TableCell>
                                <TableCell>{transaction.category}</TableCell>
                                <TableCell className={`text-right ${transaction.occurred ? 'text-red-600' : 'text-red-300'}`}>
                                  {formatCurrency(transaction.amount)}
                                </TableCell>
                                <TableCell className={transaction.occurred ? 'text-red-600' : 'text-red-300'}>
                                  {transaction.occurred ? 'Paid' : 'Pending'}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        <DialogFooter className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedValue("all");
              setShowReport(false);
            }}
          >
            Back
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}