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
import { AlertCircle, X } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as Icons from 'lucide-react';

// Add DynamicIcon component for rendering category icons
const DynamicIcon = ({ iconName }: { iconName: string | null | undefined }) => {
  if (!iconName) return null;

  // Convert icon name to match Lucide naming convention (e.g., "shopping-cart" to "ShoppingCart")
  const formatIconName = (name: string) => {
    return name.split('-').map(part =>
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ).join('');
  };

  const IconComponent = (Icons as any)[formatIconName(iconName)];
  return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
};

interface Transaction {
  date: string;
  description: string;
  amount: number;
  occurred: boolean;
  category: string;
  color?: string;
  icon?: string | null;
}

interface Category {
  id: number;
  name: string;
  color: string;
  icon?: string;
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  day: number;
  category_id: number;
  user_id: number;
  created_at: string;
  isOneTime: boolean;
  category_name: string;
  category_color: string;
  category?: { icon: string | null }; // Added category field with icon
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
  const [previousReport, setPreviousReport] = useState<{ value: string, date: DateRange | undefined } | null>(null);
  const today = useMemo(() => dayjs(), []);

  // Fetch categories for reference
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: isOpen,
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
      const categoryName = bill.category_name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push({
        ...bill,
        categoryColor: bill.category_color || '#D3D3D3'
      });
      return acc;
    }, {});

    return {
      categories: Object.keys(categorizedBills).sort((a, b) =>
        a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b)
      ),
      categorizedBills
    };
  }, [bills]);

  // Update the transactions generation to include icon information
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

    let filteredBills = bills;

    // Filter based on selection
    if (selectedValue !== "all" && selectedValue !== "all_categories") {
      if (selectedValue.startsWith('expense_')) {
        const expenseId = selectedValue.replace('expense_', '');
        filteredBills = bills.filter(bill => bill.id === expenseId);
      } else if (selectedValue.startsWith('category_')) {
        const categoryName = selectedValue.replace('category_', '');
        filteredBills = bills.filter(bill => bill.category_name === categoryName);
      }
    }

    const startDate = dayjs(date.from);
    const endDate = dayjs(date.to);
    const result: Transaction[] = [];

    // Generate transactions for each bill
    filteredBills.forEach(bill => {
      const billAmount = typeof bill.amount === 'string' ? parseFloat(bill.amount) : bill.amount;
      if (isNaN(billAmount)) {
        console.error('Invalid amount for bill:', bill);
        return;
      }

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
            amount: billAmount,
            occurred: currentDate.isSameOrBefore(today),
            category: bill.category_name || 'Uncategorized',
            color: bill.category_color || '#D3D3D3'
          });
        }
        currentDate = currentDate.add(1, 'month');
      }
    });

    return result.map(transaction => {
      const categoryBill = bills.find(b => b.category_name === transaction.category);
      return {
        ...transaction,
        icon: categoryBill?.category?.icon || null
      };
    }).sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
  }, [showReport, selectedValue, date, bills, today]);

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


  // Update the bill finding logic
  const getBillById = (id: string) => bills.find(b => b.id === id);

  // Update where we handle the bill ID in the dialog title
  const getDialogTitle = () => {
    if (selectedValue === "all") return "All Expenses Combined";
    if (selectedValue === "all_categories") return "All Categories Combined";
    if (selectedValue.startsWith('expense_')) {
      const billId = selectedValue.replace('expense_', '');
      return getBillById(billId)?.name || "Expense Report";
    }
    if (selectedValue.startsWith('category_')) {
      return `${selectedValue.replace('category_', '')} Category`;
    }
    return "Expense Report";
  };

  if (!showReport) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Generate Expense Report
              {date?.from && date?.to && (
                <div className="text-sm font-normal text-muted-foreground mt-1">
                  {dayjs(date.from).format('MMM D, YYYY')} - {dayjs(date.to).format('MMM D, YYYY')}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select View Option</label>
              <Select value={selectedValue} onValueChange={setSelectedValue}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  align="start"
                  side="bottom"
                  sideOffset={4}
                  className="max-h-[200px] overflow-y-auto"
                >
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
                className="rounded-md w-full max-h-[300px]"
              />
            </div>

            {dateError && (
              <div className="text-sm text-red-500">
                {dateError}
              </div>
            )}

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
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowReport(true);
                setPreviousReport({ value: selectedValue, date: date });
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

  // Update category display component to show icons
  function CategoryDisplay({ category, color, icon }: { category: string; color: string; icon?: string | null }) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <DynamicIcon iconName={icon} />
        <span>{category}</span>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl">
                {getDialogTitle()}
                <div className="text-sm font-normal text-muted-foreground mt-1">
                  {date?.from && date?.to && `${dayjs(date?.from).format('MMM D, YYYY')} - ${dayjs(date?.to).format('MMM D, YYYY')}`}
                </div>
              </DialogTitle>
            </div>
            <div className="flex gap-2 items-center">
              <Button variant="outline" onClick={handleBackToSelection}>
                Back to Selection
              </Button>
              <DialogClose asChild>
                <button
                  className="rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {transactions.length === 0 && showReport ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {bills.length === 0
                  ? "No bills have been added yet. Please add some bills to generate a report."
                  : "No transactions found for the selected date range and filters."}
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
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(summary.totalAmount)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-sm font-medium">Paid to Date</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(summary.occurredAmount)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-300">
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
                                <CategoryDisplay
                                  category={ct.category}
                                  color={ct.color}
                                  icon={bills.find(b => b.category_name === ct.category)?.category?.icon}
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(ct.total)}
                              </TableCell>
                              <TableCell className="text-right text-blue-600">
                                {formatCurrency(ct.occurred)}
                              </TableCell>
                              <TableCell className="text-right text-blue-300">
                                {formatCurrency(ct.pending)}
                              </TableCell>
                              <TableCell className="text-right text-blue-600">
                                {ct.occurredCount}
                              </TableCell>
                              <TableCell className="text-right text-blue-300">
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
                                <CategoryDisplay category={expense.category} color={expense.color} icon={bills.find(b => b.category_name === expense.category)?.category?.icon} />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(expense.totalAmount / expense.transactions.length)}
                              </TableCell>
                              <TableCell>
                                <div className="text-right font-medium">
                                  {formatCurrency(expense.totalAmount)}
                                </div>
                                <div className="text-right text-xs">
                                  <span className="text-blue-600 font-medium">
                                    {formatCurrency(expense.occurredAmount)}</span>
                                  {" / "}
                                  <span className="text-blue-300">
                                    {formatCurrency(expense.pendingAmount)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-right font-medium">
                                  {expense.occurredCount + expense.pendingCount}
                                </div>
                                <div className="text-right text-xs">
                                  <span className="text-blue-600 font-medium">
                                    {expense.occurredCount}</span>
                                  {" / "}
                                  <span className="text-blue-300">
                                    {expense.pendingCount}</span>
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
                                <CategoryDisplay category={item.category} color={item.color} icon={bills.find(b => b.category_name === item.category)?.category?.icon} />
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.total / (item.occurredCount + item.pendingCount))}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.total)}
                              </TableCell>
                              <TableCell className="text-right text-blue-600">
                                {formatCurrency(item.occurred)}
                              </TableCell>
                              <TableCell className="text-right text-blue-300">
                                {formatCurrency(item.pending)}
                              </TableCell>
                              <TableCell className="text-right text-blue-600">
                                {item.occurredCount}
                              </TableCell>
                              <TableCell className="text-right text-blue-300">
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
                              <div className="flex justify-between items-center">
                                <span className="text-blue-600">Net Balance up today:</span>
                                <span className="text-blue-600">{formatCurrency(monthlyTotal)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-blue-600">Net:</span>
                                <span className="text-blue-600">{formatCurrency(monthlyPaid)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-blue-600">Monthly Net:</span>
                                <span className="text-blue-600">{formatCurrency(monthlyTotal - monthlyPaid)}</span>
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
                                            <CategoryDisplay category={transaction.category} color={transaction.color} icon={transaction.icon} />
                                          </TableCell>
                                          <TableCell className={`text-right ${transaction.occurred ? 'text-blue-600' : 'text-blue-300'}`}>
                                            {formatCurrency(transaction.amount)}
                                          </TableCell>
                                          <TableCell className={`${transaction.occurred ? 'text-blue-600' : 'text-blue-300'}`}>
                                            {transaction.occurred ? 'Paid' : 'Pending'}
                                          </TableCell>
                                        </>
                                      ) : (
                                        <>
                                          <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                                          <TableCell>{transaction.description}</TableCell>
                                          <TableCell>
                                            <CategoryDisplay category={transaction.category} color={transaction.color} icon={transaction.icon} />
                                          </TableCell>
                                          <TableCell className={`text-right ${transaction.occurred ? 'text-blue-600' : 'text-blue-300'}`}>
                                            {formatCurrency(transaction.amount)}
                                          </TableCell>
                                          <TableCell className={`${transaction.occurred ? 'text-blue-600' : 'text-blue-300'}`}>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}