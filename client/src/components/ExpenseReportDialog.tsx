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
  color?: string;
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
  occurred: number;
  color: string;
  occurredCount: number;
  pendingCount: number;
  pending: number;
}

interface ExpenseReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bills: Bill[];
}

interface GroupedExpense {
  description: string;
  category: string;
  totalAmount: number;
  occurredAmount: number;
  pendingAmount: number;
  color: string;
  transactions: Transaction[];
  occurredCount: number;
  pendingCount: number;
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
    const categorizedBills = bills.reduce<Record<string, (Bill & { categoryColor: string })[]>>((acc, bill) => {
      const category = categories.find(c => c.id === bill.categoryId);
      const categoryName = category ? category.name : 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push({
        ...bill,
        categoryColor: category?.color || '#D3D3D3'
      });
      return acc;
    }, {});

    return {
      categories: Object.keys(categorizedBills).sort((a, b) => 
        a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b)
      ),
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
        const categoryName = selectedValue.replace('category_', '');
        filteredBills = bills.filter(bill => {
          const category = categories.find(c => c.id === bill.categoryId);
          return category?.name === categoryName;
        });
      }
    }

    const startDate = dayjs(date.from);
    const endDate = dayjs(date.to);
    const result: Transaction[] = [];

    // Generate transactions for each bill
    filteredBills.forEach(bill => {
      const category = categories.find(c => c.id === bill.categoryId);
      const categoryName = category ? category.name : 'Uncategorized';
      const categoryColor = category?.color || '#D3D3D3';

      // Generate all occurrences within the date range
      let currentDate = startDate.clone().startOf('month').date(bill.day);

      // If the first occurrence is before the start date, move to next month
      if (currentDate.isBefore(startDate)) {
        currentDate = currentDate.add(1, 'month');
      }

      while (currentDate.isSameOrBefore(endDate)) {
        // Only add if the occurrence falls within the date range
        if (currentDate.isBetween(startDate, endDate, 'day', '[]')) {
          result.push({
            date: currentDate.format('YYYY-MM-DD'),
            description: bill.name,
            amount: bill.amount,
            occurred: currentDate.isSameOrBefore(today),
            category: categoryName,
            color: categoryColor
          });
        }
        currentDate = currentDate.add(1, 'month');
      }
    });

    return result.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
  }, [showReport, selectedValue, date, bills, categories, today]);

  // Group transactions by expense name for the "all" view
  const groupedExpenses = useMemo(() => {
    if (selectedValue !== "all") return [];

    const groups: Record<string, GroupedExpense> = {};

    transactions.forEach(transaction => {
      if (!groups[transaction.description]) {
        groups[transaction.description] = {
          description: transaction.description,
          category: transaction.category,
          totalAmount: 0,
          occurredAmount: 0,
          pendingAmount: 0,
          color: transaction.color || '#D3D3D3',
          transactions: [],
          occurredCount: 0,
          pendingCount: 0
        };
      }

      const group = groups[transaction.description];
      group.totalAmount += transaction.amount;
      if (transaction.occurred) {
        group.occurredAmount += transaction.amount;
        group.occurredCount++;
      } else {
        group.pendingAmount += transaction.amount;
        group.pendingCount++;
      }
      group.transactions.push(transaction);
    });

    return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [transactions, selectedValue]);

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

  // Calculate expense/category totals depending on mode
  const itemTotals = useMemo(() => {
    if (!transactions.length) return [];

    if (selectedValue === "all_categories") {
      // Category totals logic with occurrence tracking
      const totals: Record<string, { 
        category: string;
        total: number;
        occurred: number;
        pending: number;
        occurredCount: number;
        pendingCount: number;
        color: string;
      }> = {};

      transactions.forEach(t => {
        if (!totals[t.category]) {
          totals[t.category] = {
            category: t.category,
            total: 0,
            occurred: 0,
            pending: 0,
            occurredCount: 0,
            pendingCount: 0,
            color: t.color || '#D3D3D3'
          };
        }
        totals[t.category].total += t.amount;
        if (t.occurred) {
          totals[t.category].occurred += t.amount;
          totals[t.category].occurredCount++;
        } else {
          totals[t.category].pending += t.amount;
          totals[t.category].pendingCount++;
        }
      });

      return Object.values(totals).sort((a, b) => b.total - a.total);
    } else if (selectedValue === "all") {
      // Expense totals logic with occurrences
      const totals: Record<string, { 
        description: string;
        category: string;
        total: number; 
        occurred: number; 
        pending: number;
        occurredCount: number;
        pendingCount: number;
        color: string;
      }> = {};

      transactions.forEach(t => {
        if (!totals[t.description]) {
          totals[t.description] = {
            description: t.description,
            category: t.category,
            total: 0,
            occurred: 0,
            pending: 0,
            occurredCount: 0,
            pendingCount: 0,
            color: t.color || '#D3D3D3'
          };
        }
        totals[t.description].total += t.amount;
        if (t.occurred) {
          totals[t.description].occurred += t.amount;
          totals[t.description].occurredCount++;
        } else {
          totals[t.description].pending += t.amount;
          totals[t.description].pendingCount++;
        }
      });

      return Object.values(totals).sort((a, b) => b.total - a.total);
    } else if (selectedValue.startsWith('category_') || selectedValue.startsWith('expense_')) {
      // Individual category/expense totals logic with occurrences
      const totals: Record<string, { 
        description: string;
        category: string;
        total: number; 
        occurred: number; 
        pending: number;
        occurredCount: number;
        pendingCount: number;
        color: string;
      }> = {};

      transactions.forEach(t => {
        if (!totals[t.description]) {
          totals[t.description] = {
            description: t.description,
            category: t.category,
            total: 0,
            occurred: 0,
            pending: 0,
            occurredCount: 0,
            pendingCount: 0,
            color: t.color || '#D3D3D3'
          };
        }
        totals[t.description].total += t.amount;
        if (t.occurred) {
          totals[t.description].occurred += t.amount;
          totals[t.description].occurredCount++;
        } else {
          totals[t.description].pending += t.amount;
          totals[t.description].pendingCount++;
        }
      });

      return Object.values(totals).sort((a, b) => b.total - a.total);
    }

    return [];
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

              {/* Category/Expense Summary Section */}
              {selectedValue === "all_categories" && itemTotals.length > 0 && (
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
                          <TableHead className="text-right">Paid Occurrences</TableHead>
                          <TableHead className="text-right">Pending Occurrences</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemTotals.map((ct: any) => (
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
                            <TableCell className="text-right text-red-600">
                              {ct.occurredCount}
                            </TableCell>
                            <TableCell className="text-right text-red-300">
                              {ct.pendingCount}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {selectedValue === "all" && groupedExpenses.length > 0 && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle>Expenses Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">Expense</TableHead>
                          <TableHead className="w-[140px]">Category</TableHead>
                          <TableHead className="text-right w-[100px]">Monthly</TableHead>
                          <TableHead className="text-right w-[120px]">
                            <div>Total Amount</div>
                            <div className="text-xs font-normal">Paid / Pending</div>
                          </TableHead>
                          <TableHead className="text-right w-[100px]">
                            <div>Occurrences</div>
                            <div className="text-xs font-normal">Paid / Pending</div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-sm">
                        {groupedExpenses.map((expense) => (
                          <TableRow key={expense.description}>
                            <TableCell className="font-medium">{expense.description}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: expense.color }}
                                />
                                <span className="truncate font-medium">{expense.category}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(expense.totalAmount / expense.transactions.length)}
                            </TableCell>
                            <TableCell>
                              <div className="text-right font-medium">
                                {formatCurrency(expense.totalAmount)}
                              </div>
                              <div className="text-right text-xs">
                                <span className="text-red-600 font-medium">{formatCurrency(expense.occurredAmount)}</span>
                                {" / "}
                                <span className="text-red-300">{formatCurrency(expense.pendingAmount)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-right font-medium">
                                {expense.occurredCount + expense.pendingCount}
                              </div>
                              <div className="text-right text-xs">
                                <span className="text-red-600 font-medium">{expense.occurredCount}</span>
                                {" / "}
                                <span className="text-red-300">{expense.pendingCount}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {selectedValue !== "all" && selectedValue !== "all_categories" && itemTotals.length > 0 && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle>Expense Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Expense</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Monthly Amount</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                          <TableHead className="text-right">Paid Amount</TableHead>
                          <TableHead className="text-right">Pending Amount</TableHead>
                          <TableHead className="text-right">Paid Occurrences</TableHead>
                          <TableHead className="text-right">Pending Occurrences</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemTotals.map((item: any) => (
                          <TableRow key={item.description}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: item.color }}
                                />
                                {item.category}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.total / (item.occurredCount + item.pendingCount))}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.total)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {formatCurrency(item.occurred)}
                            </TableCell>
                            <TableCell className="text-right text-red-300">
                              {formatCurrency(item.pending)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {item.occurredCount}
                            </TableCell>
                            <TableCell className="text-right text-red-300">
                              {item.pendingCount}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {selectedValue !== "all" && (
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
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}