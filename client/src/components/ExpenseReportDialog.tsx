import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";
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

interface CategoryTotal {
  category: string;
  total: number;
  occurred: number;
  pending: number;
  color: string;
  icon: string | null;
  transactions: Transaction[];
}

interface ExpenseReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const DynamicIcon = ({ iconName, className = "h-4 w-4" }: { iconName: string | null | undefined, className?: string }) => {
  if (!iconName) return null;
  const formatIconName = (name: string) => {
    return name.split('-').map(part =>
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ).join('');
  };
  const IconComponent = (Icons as any)[formatIconName(iconName)];
  return IconComponent ? <IconComponent className={className} /> : null;
};

interface CategoryDisplayProps {
  category: string;
  color: string;
  icon: string | null;
}

const CategoryDisplay = ({ category, color, icon }: CategoryDisplayProps) => (
  <div className="flex items-center gap-2">
    <div
      className="w-3 h-3 rounded-full"
      style={{ backgroundColor: color || '#D3D3D3' }}
    />
    {icon && <DynamicIcon iconName={icon} />}
    <span>{category}</span>
  </div>
);

export default function ExpenseReportDialog({ isOpen, onOpenChange }: ExpenseReportDialogProps) {
  const [selectedValue, setSelectedValue] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>();
  const [showReport, setShowReport] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const currentDate = useMemo(() => dayjs('2025-02-18'), []); // Fixed current date for consistency

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedValue("all");
      setDate(undefined);
      setShowReport(false);
      setDateError(null);
    }
  }, [isOpen]);

  // Query transactions with explicit expense type filter
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/transactions', {
      type: 'expense', // Explicitly request only expense transactions
      startDate: date?.from ? dayjs(date.from).startOf('day').format('YYYY-MM-DD') : undefined,
      endDate: date?.to ? dayjs(date.to).endOf('day').format('YYYY-MM-DD') : undefined
    }],
    enabled: showReport && !!date?.from && !!date?.to
  });

  // Filter transactions by date range and mark as occurred/pending
  const filteredTransactions = useMemo(() => {
    if (!date?.from || !date?.to || !transactions.length) return [];

    const startDate = dayjs(date.from).startOf('day');
    const endDate = dayjs(date.to).endOf('day');

    return transactions
      .filter(transaction => {
        // Only include expense transactions
        if (transaction.type !== 'expense') return false;

        const transactionDate = dayjs(transaction.date);
        return transactionDate.isSameOrAfter(startDate, 'day') &&
               transactionDate.isSameOrBefore(endDate, 'day');
      })
      .map(transaction => {
        const transactionDate = dayjs(transaction.date);
        return {
          ...transaction,
          occurred: transactionDate.isSameOrBefore(currentDate, 'day')
        };
      });
  }, [transactions, date, currentDate]);

  // Calculate category totals
  const categoryTotals = useMemo(() => {
    const totals: Record<string, CategoryTotal> = {};

    filteredTransactions.forEach(transaction => {
      const { category_name, category_color, category_icon } = transaction;

      if (!totals[category_name]) {
        totals[category_name] = {
          category: category_name,
          total: 0,
          occurred: 0,
          pending: 0,
          color: category_color,
          icon: category_icon,
          transactions: []
        };
      }

      const total = totals[category_name];
      total.total += transaction.amount;
      if (transaction.occurred) {
        total.occurred += transaction.amount;
      } else {
        total.pending += transaction.amount;
      }
      total.transactions.push(transaction);
    });

    return Object.values(totals).sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  // Calculate display totals
  const displayTotals = useMemo(() => {
    const paid = filteredTransactions
      .filter(t => t.occurred)
      .reduce((sum, t) => sum + t.amount, 0);

    const pending = filteredTransactions
      .filter(t => !t.occurred)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      total: paid + pending,
      paid,
      pending
    };
  }, [filteredTransactions]);

  // Handle date selection
  const handleDateSelect = (selectedDate: DateRange | undefined) => {
    if (selectedDate?.from && !selectedDate.to) {
      setDate({
        from: selectedDate.from,
        to: selectedDate.from
      });
    } else {
      setDate(selectedDate);
    }
  };

  // Selection view
  if (!showReport) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                onSelect={handleDateSelect}
                numberOfMonths={1}
                defaultMonth={currentDate.toDate()}
              />
            </div>

            <div className="text-sm font-medium text-muted-foreground">
              {date?.from ? (
                <>
                  Selected Range: {dayjs(date.from).format('MMM D, YYYY')}
                  {date.to ? ` - ${dayjs(date.to).format('MMM D, YYYY')}` : ''}
                </>
              ) : (
                'Select start and end dates'
              )}
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
              disabled={!date?.from || !date?.to || transactionsLoading}
            >
              {transactionsLoading ? "Loading..." : "Generate Report"}
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
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl">
              Expense Report ({selectedValue === 'all' ? 'All Categories' :
                selectedValue === 'categories' ? 'By Category' :
                selectedValue.replace('category_', '')})
            </DialogTitle>
            <Button variant="outline" onClick={() => setShowReport(false)}>
              Back to Selection
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {dayjs(date?.from).format('MMM D, YYYY')} - {dayjs(date?.to).format('MMM D, YYYY')}
          </div>
        </DialogHeader>

        {transactionsLoading ? (
          <div className="flex justify-center items-center p-8">
            <span className="text-muted-foreground">Loading report data...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(displayTotals.total)}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Paid</div>
                      <div className="text-lg font-semibold text-red-600">
                        {formatCurrency(displayTotals.paid)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Pending</div>
                      <div className="text-lg font-semibold text-yellow-600">
                        {formatCurrency(displayTotals.pending)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {categoryTotals.map((cat) => (
                      <div key={cat.category} className="flex justify-between items-center">
                        <CategoryDisplay
                          category={cat.category}
                          color={cat.color}
                          icon={cat.icon}
                        />
                        <span className="font-semibold">
                          {formatCurrency(cat.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transaction Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions
                      .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
                      .map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                          <TableCell>
                            <CategoryDisplay
                              category={transaction.category_name}
                              color={transaction.category_color}
                              icon={transaction.category_icon}
                            />
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell>
                            <span className={transaction.occurred ? "text-red-600" : "text-yellow-600"}>
                              {transaction.occurred ? 'Paid' : 'Pending'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}