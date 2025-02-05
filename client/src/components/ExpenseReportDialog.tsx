import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useState, useEffect } from 'react';
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
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  day: number;
}

interface ExpenseReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bills: Bill[];
}

export default function ExpenseReportDialog({ isOpen, onOpenChange, bills }: ExpenseReportDialogProps) {
  const [selectedBillId, setSelectedBillId] = useState<string | undefined>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [date, setDate] = useState<DateRange | undefined>();
  const [showReport, setShowReport] = useState(false);
  const today = dayjs();
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedBillId(undefined);
      setDate(undefined);
      setShowReport(false);
      setTransactions([]);
      setDateError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!showReport || !selectedBillId || !date?.from || !date?.to) return;

    // Validate date range
    if (dayjs(date.to).isBefore(date.from)) {
      setDateError("End date cannot be before start date");
      setDate({
        from: date.from,
        to: date.from
      });
      return;
    }

    setDateError(null);
    const selectedBill = bills.find(bill => bill.id === selectedBillId);
    if (!selectedBill) return;

    const startDate = dayjs(date.from);
    const endDate = dayjs(date.to);
    const mockTransactions: Transaction[] = [];

    let currentMonth = startDate.startOf('month');
    while (currentMonth.isSameOrBefore(endDate)) {
      const transactionDate = currentMonth.date(selectedBill.day);
      if (transactionDate.isBetween(startDate, endDate, 'day', '[]')) {
        mockTransactions.push({
          date: transactionDate.format('YYYY-MM-DD'),
          description: selectedBill.name,
          amount: selectedBill.amount,
          occurred: transactionDate.isSameOrBefore(today)
        });
      }
      currentMonth = currentMonth.add(1, 'month');
    }

    setTransactions(mockTransactions);
  }, [showReport, selectedBillId, date, bills, today]);

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const occurredAmount = transactions.filter(t => t.occurred).reduce((sum, t) => sum + t.amount, 0);
  const pendingAmount = totalAmount - occurredAmount;

  if (!selectedBillId || !showReport) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[400px]"
          aria-describedby="expense-report-description"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {selectedBillId ? 'Select Date Range' : 'Select Expense'}
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
            {!selectedBillId ? (
              <Select onValueChange={(value) => setSelectedBillId(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose an expense" />
                </SelectTrigger>
                <SelectContent>
                  {bills.map((bill) => (
                    <SelectItem key={bill.id} value={bill.id}>
                      {bill.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedBillId(undefined);
                setDate(undefined);
                setDateError(null);
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            {selectedBillId && (
              <Button
                onClick={() => setShowReport(true)}
                disabled={!date?.from || !date?.to || !!dateError}
              >
                Generate Report
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedBill = bills.find(b => b.id === selectedBillId)!;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-labelledby="expense-report-title">
        <DialogHeader>
          <DialogTitle id="expense-report-title" className="text-xl">
            Expense Report: {selectedBill.name}
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
                    {formatCurrency(totalAmount)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Paid to Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(occurredAmount)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-300">
                    {formatCurrency(pendingAmount)}
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
      </DialogContent>
    </Dialog>
  );
}