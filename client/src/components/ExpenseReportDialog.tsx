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
import { useQuery } from "@tanstack/react-query";
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
  category: string;
  color?: string; // Added color property
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  day: number;
  categoryId: number;
}

interface Category {
  id: number;
  name: string;
  color: string;
}

interface CategoryTotal {
  category: string;
  amount: number;
  occurred: boolean;
  color: string;
}

interface ExpenseReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bills: Bill[];
}

export default function ExpenseReportDialog({ isOpen, onOpenChange, bills }: ExpenseReportDialogProps) {
  const [selectedValue, setSelectedValue] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>();
  const [showReport, setShowReport] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [previousReport, setPreviousReport] = useState<{value: string, date: DateRange | undefined} | null>(null);
  const today = useMemo(() => dayjs(), []);

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedValue("all");
      setDate(undefined);
      setShowReport(false);
      setDateError(null);
      setPreviousReport(null);
    }
  }, [isOpen]);

  // Group bills by category and prepare dropdown options
  const dropdownOptions = useMemo(() => {
    const categorizedBills = bills.reduce((acc, bill) => {
      const category = categories.find(c => c.id === bill.categoryId)?.name || 'Uncategorized';
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
  }, [bills, categories]);

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
    if (selectedValue !== "all" && selectedValue !== "all_categories") {
      if (selectedValue.startsWith('expense_')) {
        const expenseId = selectedValue.replace('expense_', '');
        filteredBills = bills.filter(bill => bill.id === expenseId);
      } else if (selectedValue.startsWith('category_')) {
        const category = selectedValue.replace('category_', '');
        filteredBills = bills.filter(bill => {
          const billCategory = categories.find(c => c.id === bill.categoryId)?.name;
          return billCategory === category;
        });
      }
    }

    const startDate = dayjs(date.from);
    const endDate = dayjs(date.to);
    const result: Transaction[] = [];

    // For "all_categories", group by category
    if (selectedValue === "all_categories") {
      // Create a map to store category totals for each month
      const categoryTotalsByMonth: Record<string, CategoryTotal[]> = {};

      filteredBills.forEach(bill => {
        const category = categories.find(c => c.id === bill.categoryId);
        if (!category) return;

        let currentMonth = startDate.startOf('month');
        while (currentMonth.isSameOrBefore(endDate)) {
          const transactionDate = currentMonth.date(bill.day);

          if (transactionDate.isBetween(startDate, endDate, 'day', '[]')) {
            const monthKey = transactionDate.format('YYYY-MM');

            if (!categoryTotalsByMonth[monthKey]) {
              categoryTotalsByMonth[monthKey] = [];
            }

            // Find existing category total for this month
            let categoryTotal = categoryTotalsByMonth[monthKey].find(ct => ct.category === category.name);

            if (!categoryTotal) {
              categoryTotal = {
                category: category.name,
                amount: 0,
                occurred: false,
                color: category.color
              };
              categoryTotalsByMonth[monthKey].push(categoryTotal);
            }

            categoryTotal.amount += bill.amount;
            const isOccurred = transactionDate.isSameOrBefore(today);
            categoryTotal.occurred = categoryTotal.occurred || isOccurred;
          }
          currentMonth = currentMonth.add(1, 'month');
        }
      });

      // Convert category totals to transactions
      Object.entries(categoryTotalsByMonth).forEach(([monthKey, categoryTotals]) => {
        categoryTotals.forEach(ct => {
          result.push({
            date: dayjs(monthKey).format('YYYY-MM-DD'),
            description: ct.category,
            amount: ct.amount,
            occurred: ct.occurred,
            category: ct.category,
            color: ct.color
          });
        });
      });
    } else {
      // Generate regular transactions for other views
      filteredBills.forEach(bill => {
        let currentMonth = startDate.startOf('month');
        while (currentMonth.isSameOrBefore(endDate)) {
          const transactionDate = currentMonth.date(bill.day);
          if (transactionDate.isBetween(startDate, endDate, 'day', '[]')) {
            const category = categories.find(c => c.id === bill.categoryId);
            result.push({
              date: transactionDate.format('YYYY-MM-DD'),
              description: bill.name,
              amount: bill.amount,
              occurred: transactionDate.isSameOrBefore(today),
              category: category?.name || 'Uncategorized',
              color: category?.color || '#D3D3D3'
            });
          }
          currentMonth = currentMonth.add(1, 'month');
        }
      });
    }

    return result.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
  }, [showReport, selectedValue, date, bills, categories, today]);

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

  const handleBackToSelection = () => {
    setShowReport(false);
    setSelectedValue("all");
    setDate(undefined);
    setPreviousReport(null);
  };

  // Update the categoryTotals calculation to work for both modes
  const categoryTotals = useMemo(() => {
    if (!transactions.length || (selectedValue !== "all_categories" && selectedValue !== "all")) return [];

    const totals: Record<string, { 
      category: string; 
      total: number; 
      occurred: number; 
      pending: number; 
      color: string;
    }> = {};

    transactions.forEach(t => {
      if (!totals[t.category]) {
        totals[t.category] = {
          category: t.category,
          total: 0,
          occurred: 0,
          pending: 0,
          color: t.color || '#D3D3D3'
        };
      }
      totals[t.category].total += t.amount;
      if (t.occurred) {
        totals[t.category].occurred += t.amount;
      } else {
        totals[t.category].pending += t.amount;
      }
    });

    return Object.values(totals).sort((a, b) => b.total - a.total);
  }, [transactions, selectedValue]);


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
              <label className="text-sm font-medium mb-2 block">Select View Option</label>
              <Select value={selectedValue} onValueChange={setSelectedValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {/* Combined Views */}
                  <SelectGroup>
                    <SelectLabel>Combined Views</SelectLabel>
                    <SelectItem value="all">All Expenses Combined</SelectItem>
                    <SelectItem value="all_categories">All Categories Combined</SelectItem>
                  </SelectGroup>

                  {/* Individual Categories */}
                  <SelectGroup>
                    <SelectLabel>Individual Categories</SelectLabel>
                    {dropdownOptions.categories.map((category) => (
                      <SelectItem key={`category_${category}`} value={`category_${category}`}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectGroup>

                  {/* Individual Expenses */}
                  <SelectGroup>
                    <SelectLabel>Individual Expenses</SelectLabel>
                    {bills.map((bill) => (
                      <SelectItem key={`expense_${bill.id}`} value={`expense_${bill.id}`}>
                        {bill.name} ({formatCurrency(bill.amount)})
                      </SelectItem>
                    ))}
                  </SelectGroup>
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
              onClick={() => {
                setShowReport(true);
                setPreviousReport({value: selectedValue, date: date});
              }}
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
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl">
                {selectedValue === "all"
                  ? "All Expenses Combined"
                  : selectedValue === "all_categories"
                    ? "All Categories Combined"
                    : selectedValue.startsWith('expense_')
                      ? bills.find(b => b.id === selectedValue.replace('expense_', ''))?.name || "Expense Report"
                      : selectedValue.startsWith('category_')
                        ? `${selectedValue.replace('category_', '')} Category`
                        : "Expense Report"
                }
                <div className="text-sm font-normal text-muted-foreground mt-1">
                  {date?.from && date?.to && `${dayjs(date?.from).format('MMM D, YYYY')} - ${dayjs(date?.to).format('MMM D, YYYY')}`}
                </div>
              </DialogTitle>
            </div>
            <div className="flex gap-2 items-center">
              <Button variant="outline" onClick={handleBackToSelection}>
                Back to Selection
              </Button>
              <DialogClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </div>
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
            <div className="grid gap-4 mb-4">
              {/* Main Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              {/* Category Summary Section */}
              {(selectedValue === "all_categories" || selectedValue === "all") && categoryTotals.length > 0 && (
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-lg font-medium">Category Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead className="text-right">Pending</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryTotals.map((ct) => (
                          <TableRow key={ct.category}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: ct.color }}
                                />
                                {ct.category}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(ct.total)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {formatCurrency(ct.occurred)}
                            </TableCell>
                            <TableCell className="text-right text-red-300">
                              {formatCurrency(ct.pending)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
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
                            {selectedValue === "all_categories" ? (
                              <>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Total Amount</TableHead>
                                <TableHead>Status</TableHead>
                              </>
                            ) : (
                              <>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Status</TableHead>
                              </>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthTransactions
                            .sort((a, b) => {
                              if (selectedValue === "all_categories") {
                                return a.category.localeCompare(b.category);
                              }
                              return dayjs(a.date).diff(dayjs(b.date));
                            })
                            .map((transaction, index) => (
                              <TableRow key={`${transaction.date}-${index}`}>
                                {selectedValue === "all_categories" ? (
                                  <>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-3 h-3 rounded-full"
                                          style={{ backgroundColor: transaction.color }}
                                        />
                                        {transaction.category}
                                      </div>
                                    </TableCell>
                                    <TableCell className={`text-right ${transaction.occurred ? 'text-red-600' : 'text-red-300'}`}>
                                      {formatCurrency(transaction.amount)}
                                    </TableCell>
                                    <TableCell className={transaction.occurred ? 'text-red-600' : 'text-red-300'}>
                                      {transaction.occurred ? 'Paid' : 'Pending'}
                                    </TableCell>
                                  </>
                                ) : (
                                  <>
                                    <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                                    <TableCell>{transaction.description}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-3 h-3 rounded-full"
                                          style={{ backgroundColor: transaction.color }}
                                        />
                                        {transaction.category}
                                      </div>
                                    </TableCell>
                                    <TableCell className={`text-right ${transaction.occurred ? 'text-red-600' : 'text-red-300'}`}>
                                      {formatCurrency(transaction.amount)}
                                    </TableCell>
                                    <TableCell className={transaction.occurred ? 'text-red-600' : 'text-red-300'}>
                                      {transaction.occurred ? 'Paid' : 'Pending'}
                                    </TableCell>
                                  </>
                                )}
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
      </DialogContent>
    </Dialog>
  );
}