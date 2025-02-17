import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";
import { Bill } from "@/types";
import { formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
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
import * as Icons from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'expense';
  category_name: string;
  category_color: string;
  category_icon: string | null;
  category_id: number;
  occurred: boolean;
}

interface ExpenseReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const generateTransactions = (dateRange: DateRange, bills: Bill[], currentDate: dayjs.Dayjs): Transaction[] => {
  if (!dateRange?.from || !dateRange?.to || !bills) return [];

  const startDate = dayjs(dateRange.from);
  const endDate = dayjs(dateRange.to);
  const transactions: Transaction[] = [];

  bills.forEach(bill => {
    let currentMonth = startDate.startOf('month');
    while (currentMonth.isSameOrBefore(endDate)) {
      const billDate = currentMonth.date(bill.day);
      if (billDate.isBetween(startDate, endDate, 'day', '[]')) {
        transactions.push({
          id: `${bill.id}-${billDate.format('YYYY-MM-DD')}`,
          date: billDate.format('YYYY-MM-DD'),
          description: bill.name,
          amount: bill.amount,
          type: 'expense',
          category_name: bill.category_name,
          category_color: bill.category_color,
          category_icon: bill.category_icon || null,
          category_id: bill.category_id,
          occurred: billDate.isSameOrBefore(currentDate)
        });
      }
      currentMonth = currentMonth.add(1, 'month');
    }
  });

  return transactions;
};

export default function ExpenseReportDialog({ isOpen, onOpenChange }: ExpenseReportDialogProps) {
  const [selectedValue, setSelectedValue] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>();
  const [showReport, setShowReport] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [generatedTransactions, setGeneratedTransactions] = useState<Transaction[]>([]);
  const today = useMemo(() => dayjs(), []);

  const { data: bills = [], isLoading: billsLoading } = useQuery({
    queryKey: ['/api/bills'],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    cacheTime: 1000 * 60 * 10 // Keep cache for 10 minutes
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedValue("all");
      setDate(undefined);
      setShowReport(false);
      setDateError(null);
      setGeneratedTransactions([]);
    }
  }, [isOpen]);

  // Generate transactions when showing report
  useEffect(() => {
    if (!showReport || !date?.from || !date?.to || !bills) return;
    const transactions = generateTransactions(date, bills, today);
    setGeneratedTransactions(transactions);
  }, [showReport, date, bills, today]);

  // Selection view
  if (!showReport) {
    return (
      <Dialog 
        open={isOpen} 
        onOpenChange={onOpenChange}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Generate Expense Report</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col space-y-4">
            <div>
              <label className="text-sm font-medium">Select View Option</label>
              <Select value={selectedValue} onValueChange={setSelectedValue}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Views</SelectLabel>
                    <SelectItem value="all">All Expenses</SelectItem>
                    <SelectItem value="categories">By Category</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-4">
              <Calendar
                mode="range"
                selected={date}
                onSelect={setDate}
                numberOfMonths={1}
                defaultMonth={today.toDate()}
              />
            </div>

            {dateError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{dateError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!date?.from || !date?.to) {
                  setDateError("Please select start and end dates");
                  return;
                }
                setShowReport(true);
              }}
              disabled={!date?.from || !date?.to || billsLoading}
            >
              {billsLoading ? "Loading..." : "Generate Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Report view
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Expense Report
            <div className="text-sm font-normal text-muted-foreground mt-1">
              {dayjs(date?.from).format('MMM D, YYYY')} - {dayjs(date?.to).format('MMM D, YYYY')}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Expenses</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(generatedTransactions.reduce((sum, t) => sum + t.amount, 0))}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Transactions</div>
                  <div className="text-2xl font-bold">{generatedTransactions.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-4">
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
                {generatedTransactions
                  .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
                  .map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className="text-right">{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>{transaction.occurred ? 'Paid' : 'Pending'}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowReport(false)}>
            Back to Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}