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
  SelectItem,
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
  category?: string; // Added category field
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  day: number;
  category?: string; // Added category field
}

interface ExpenseReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bills: Bill[];
}

export default function ExpenseReportDialog({ isOpen, onOpenChange, bills }: ExpenseReportDialogProps) {
  const [selectedBillId, setSelectedBillId] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>();
  const [showReport, setShowReport] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const today = useMemo(() => dayjs(), []); // Memoize today's date

  // Get unique categories from bills, including undefined/null as "Uncategorized"
  const categories = useMemo(() => {
    const uniqueCategories = new Set(bills.map(bill => bill.category || 'Uncategorized'));
    return ['all', ...Array.from(uniqueCategories).sort()];
  }, [bills]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedBillId(undefined);
      setSelectedCategory("all");
      setDate(undefined);
      setShowReport(false);
      setDateError(null);
    }
  }, [isOpen]);

  // Memoize transactions calculation
  const transactions = useMemo(() => {
    if (!showReport || (!selectedBillId && selectedCategory === "all") || !date?.from || !date?.to) return [];

    // Validate date range
    if (dayjs(date.to).isBefore(date.from)) {
      setDateError("End date cannot be before start date");
      setDate({
        from: date.from,
        to: date.from
      });
      return [];
    }

    setDateError(null);
    let filteredBills = bills;

    // Filter by specific bill if selected
    if (selectedBillId) {
      filteredBills = bills.filter(bill => bill.id === selectedBillId);
    }
    // Filter by category if not "all" and no specific bill selected
    else if (selectedCategory !== "all") {
      filteredBills = bills.filter(bill => (bill.category || 'Uncategorized') === selectedCategory);
    }

    const startDate = dayjs(date.from);
    const endDate = dayjs(date.to);
    const result: Transaction[] = [];

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
            category: bill.category || 'Uncategorized'
          });
        }
        currentMonth = currentMonth.add(1, 'month');
      }
    });

    return result;
  }, [showReport, selectedBillId, selectedCategory, date, bills, today]);

  // Memoize summary calculations - moved inside component
  const summary = useMemo(() => {
    const totalAmount = transactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    const occurredAmount = transactions
      .filter((t: Transaction) => t.occurred)
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    return {
      totalAmount,
      occurredAmount,
      pendingAmount: totalAmount - occurredAmount
    };
  }, [transactions]);

  const handleApplyFilter = () => {
    if (!selectedBillId && selectedCategory === "all") return;
    if (!date?.from || !date?.to) return;
    setShowReport(true);
  };

  if (!showReport) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[400px]"
          aria-describedby="expense-report-description"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {selectedBillId ? 'Select Date Range' : 'Filter Expenses'}
            </DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          <div id="expense-report-description" className="sr-only">
            Select an expense and date range to generate a detailed expense report
          </div>

          <div className="flex flex-col space-y-4 py-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Filter By</label>
                <Select
                  value={selectedBillId ? "bill" : "category"}
                  onValueChange={(value) => {
                    if (value === "bill") {
                      setSelectedCategory("all");
                    } else {
                      setSelectedBillId(undefined);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose filter type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bill">Specific Bill</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!selectedBillId ? (
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select onValueChange={(value) => setSelectedBillId(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a bill" />
                  </SelectTrigger>
                  <SelectContent>
                    {bills.map((bill) => (
                      <SelectItem key={bill.id} value={bill.id}>
                        {bill.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {(selectedBillId || selectedCategory !== "all") && (
              <>
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
              </>
            )}
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedBillId(undefined);
                setSelectedCategory("all");
                setDate(undefined);
                setDateError(null);
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            {(selectedBillId || selectedCategory !== "all") && (
              <Button
                onClick={handleApplyFilter}
                disabled={!date?.from || !date?.to || !!dateError}
              >
                Apply Filter
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedBill = selectedBillId ? bills.find(b => b.id === selectedBillId) : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-labelledby="expense-report-title">
        <DialogHeader>
          <DialogTitle id="expense-report-title" className="text-xl">
            {selectedBill ? selectedBill.name : `${selectedCategory === 'all' ? 'All' : selectedCategory} Expenses`}
            <div className="text-sm font-normal text-muted-foreground mt-1">
              {date?.from ? `${dayjs(date?.from).format('MMM D, YYYY')} - ${dayjs(date?.to).format('MMM D, YYYY')}` : ''}
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

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">All Occurrences</CardTitle>
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
                    {transactions
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
          </>
        )}
        <DialogFooter className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedBillId(undefined);
              setSelectedCategory("all");
              setDate(undefined);
              setDateError(null);
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              // Handle form submission here
              setShowReport(true);
            }}
            disabled={!date?.from || !date?.to || !!dateError}
          >
            Submit
          </Button>
          <Button 
            onClick={() => {
              setSelectedBillId(undefined);
              setSelectedCategory("all");
              setDate(undefined);
              setShowReport(false);
              onOpenChange(false);
            }}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}