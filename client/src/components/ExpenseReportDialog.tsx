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
import * as Icons from 'lucide-react';

// Update the DynamicIcon component to properly handle icon names
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

// Update transaction interface to properly include category information and match API response
interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category_name: string;
  category_color: string;
  category_icon: string | null;
  category_id: number | null;
}

interface Category {
  id: number;
  name: string;
  color: string;
  icon?: string | null;
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
  category?: { icon: string | null };
  category_icon?: string | null;
}

interface CategoryTotal {
  category: string;
  total: number;
  occurred: number;
  pending: number;
  occurredCount: number;
  pendingCount: number;
  color: string;
  icon: string | null; // Added icon property
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

interface ExpenseReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bills: Bill[];
}

export default function ExpenseReportDialog({
  isOpen,
  onOpenChange,
  bills,
}: ExpenseReportDialogProps) {
  const [selectedValue, setSelectedValue] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>();
  const [showReport, setShowReport] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [previousReport, setPreviousReport] = useState<{ value: string, date: DateRange | undefined } | null>(null);
  const today = useMemo(() => dayjs(), []);

  // Add back handleBackToSelection function
  const handleBackToSelection = () => {
    setShowReport(false);
    setSelectedValue("all");
    setDate(undefined);
    setPreviousReport(null);
  };

  // Update to fetch transactions instead of relying on bills prop
  const { data: transactions = [], refetch: refetchTransactions } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions', 'expense'],
    queryFn: async () => {
      const response = await fetch('/api/transactions?type=expense');
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
    enabled: isOpen,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 1000 // Poll every second while dialog is open
  });

  // Force refresh when dialog opens
  useEffect(() => {
    if (isOpen) {
      refetchTransactions();
    }
  }, [isOpen, refetchTransactions]);


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

  // Update the dropdown options with fresh data.
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


  const filteredTransactions = useMemo(() => {
    if (!showReport || !date?.from || !date?.to) return [];

    // Only use actual transactions from the database within date range
    return transactions
      .filter(t => {
        const transactionDate = dayjs(t.date);
        return transactionDate.isSameOrAfter(dayjs(date.from), 'day') &&
               transactionDate.isSameOrBefore(dayjs(date.to), 'day');
      })
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  }, [showReport, date, transactions]);

  // Update groupedExpenses to properly track occurrences
  const groupedExpenses = useMemo(() => {
    if (selectedValue !== "all" || !date?.from || !date?.to) return [];

    const groups: Record<string, GroupedExpense> = {};
    const dateFrom = dayjs(date.from).startOf('day');
    const dateTo = dayjs(date.to).endOf('day');

    // Process bills within date range
    bills.forEach(bill => {
      const key = bill.name;
      if (!groups[key]) {
        groups[key] = {
          description: key,
          category: bill.category_name,
          totalAmount: 0,
          occurredAmount: 0,
          pendingAmount: 0,
          occurredCount: 0,
          pendingCount: 0,
          color: bill.category_color,
          transactions: []
        };
      }

      let currentDate = dateFrom.clone().date(bill.day);

      // If we've passed the bill day this month, start from next month
      if (currentDate.isBefore(dateFrom)) {
        currentDate = currentDate.add(1, 'month');
      }

      // Calculate occurrences within date range
      while (currentDate.isSameOrBefore(dateTo)) {
        const entry = groups[key];

        if (currentDate.isSameOrBefore(today)) {
          entry.occurredAmount += bill.amount;
          entry.occurredCount++;
        } else {
          entry.pendingAmount += bill.amount;
          entry.pendingCount++;
        }

        entry.totalAmount = entry.occurredAmount + entry.pendingAmount;
        currentDate = currentDate.add(1, 'month');
      }
    });

    return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [bills, selectedValue, date, today]);

  // Update itemTotals calculation for individual expenses
  const itemTotals = useMemo(() => {
    if (!date?.from || !date?.to) return [];

    const dateFrom = dayjs(date.from).startOf('day');
    const dateTo = dayjs(date.to).endOf('day');

    // Handle individual expense first
    if (selectedValue.startsWith('expense_')) {
      const billId = selectedValue.replace('expense_', '');
      const bill = bills.find(b => b.id === billId);

      if (!bill) {
        return [];
      }

      let total = 0;
      let occurred = 0;
      let pending = 0;
      let occurredCount = 0;
      let pendingCount = 0;

      let currentDate = dateFrom.clone().date(bill.day);

      // If we've passed the bill day this month, start from next month
      if (currentDate.isBefore(dateFrom)) {
        currentDate = currentDate.add(1, 'month');
      }

      // Generate all occurrences within date range
      while (currentDate.isSameOrBefore(dateTo)) {
        if (currentDate.isSameOrBefore(today)) {
          occurred += bill.amount;
          occurredCount++;
        } else {
          pending += bill.amount;
          pendingCount++;
        }

        currentDate = currentDate.add(1, 'month');
      }

      total = occurred + pending;

      return [{
        category: bill.name,
        total,
        occurred,
        pending,
        occurredCount,
        pendingCount,
        color: bill.category_color,
        icon: bill.category_icon || bill.category?.icon || null
      }];
    }

    // Rest of the existing itemTotals logic remains unchanged
    if (selectedValue === "all_categories") {
      const totals: Record<string, CategoryTotal> = {};
      const dateFrom = dayjs(date.from).startOf('day');
      const dateTo = dayjs(date.to).endOf('day');

      // Initialize totals for each category
      bills.forEach(bill => {
        if (!totals[bill.category_name]) {
          totals[bill.category_name] = {
            category: bill.category_name,
            total: 0,
            occurred: 0,
            pending: 0,
            occurredCount: 0,
            pendingCount: 0,
            color: bill.category_color,
            icon: bill.category_icon || bill.category?.icon || null
          };
        }

        let currentDate = dateFrom.clone().date(bill.day);

        if (currentDate.isBefore(dateFrom)) {
          currentDate = currentDate.add(1, 'month');
        }

        while (currentDate.isSameOrBefore(dateTo)) {
          const entry = totals[bill.category_name];
          if (currentDate.isSameOrBefore(today)) {
            entry.occurred += bill.amount;
            entry.occurredCount++;
          } else {
            entry.pending += bill.amount;
            entry.pendingCount++;
          }

          currentDate = currentDate.add(1, 'month');
        }
      });

      Object.values(totals).forEach(entry => {
        entry.total = entry.occurred + entry.pending;
      });

      return Object.values(totals)
        .sort((a, b) => b.total - a.total)
        .filter(entry => entry.total > 0);
    } else if (selectedValue.startsWith('category_')) {
      const categoryName = selectedValue.replace('category_', '');
      const categoryBills = bills.filter(b => b.category_name === categoryName);

      if (categoryBills.length === 0) return [];

      const categoryDetails = categoryBills[0];
      let total = 0;
      let occurred = 0;
      let pending = 0;
      let occurredCount = 0;
      let pendingCount = 0;

      const dateFrom = dayjs(date.from).startOf('day');
      const dateTo = dayjs(date.to).endOf('day');

      categoryBills.forEach(bill => {
        let currentDate = dateFrom.clone().date(bill.day);

        if (currentDate.isBefore(dateFrom)) {
          currentDate = currentDate.add(1, 'month');
        }

        while (currentDate.isSameOrBefore(dateTo)) {
          if (currentDate.isSameOrBefore(today)) {
            occurred += bill.amount;
            occurredCount++;
          } else {
            pending += bill.amount;
            pendingCount++;
          }

          currentDate = currentDate.add(1, 'month');
        }
      });

      total = occurred + pending;

      return [{
        category: categoryName,
        total,
        occurred,
        pending,
        occurredCount,
        pendingCount,
        color: categoryDetails.category_color,
        icon: categoryDetails.category_icon || categoryDetails.category?.icon || null
      }];
    }

    return [];
  }, [bills, selectedValue, date, today]);

  // Update summary calculations
  const summary = useMemo(() => {
    if (!date?.from || !date?.to) {
      return {
        totalAmount: 0,
        occurredAmount: 0,
        pendingAmount: 0
      };
    }

    // Log current state
    console.log('Summary calculation:', {
      selectedValue,
      itemTotalsLength: itemTotals.length,
      hasGroupedExpenses: groupedExpenses.length > 0
    });

    if (selectedValue === "all") {
      return {
        totalAmount: groupedExpenses.reduce((sum, expense) => sum + expense.totalAmount, 0),
        occurredAmount: groupedExpenses.reduce((sum, expense) => sum + expense.occurredAmount, 0),
        pendingAmount: groupedExpenses.reduce((sum, expense) => sum + expense.pendingAmount, 0)
      };
    }

    // Use itemTotals for all other views (categories and individual expenses)
    return {
      totalAmount: itemTotals.reduce((sum, item) => sum + item.total, 0),
      occurredAmount: itemTotals.reduce((sum, item) => sum + item.occurred, 0),
      pendingAmount: itemTotals.reduce((sum, item) => sum + item.pending, 0)
    };
  }, [selectedValue, date, groupedExpenses, itemTotals]);

  const getDialogTitle = () => {
    if (selectedValue === "all") return "All Expenses Combined";
    if (selectedValue === "all_categories") return "All Categories Combined";
    if (selectedValue.startsWith('expense_')) {
      const billId = selectedValue.replace('expense_', '');
      const bill = bills.find(b => b.id === billId);
      return bill ? `Expense Report: ${bill.name}` : "Expense Report";
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

  // Update CategoryDisplay component interface
  interface CategoryDisplayProps {
    category: string;
    color: string;
    icon: string | null;
  }

  // Update the CategoryDisplay component to display consistent icons
  function CategoryDisplay({ category, color, icon }: CategoryDisplayProps) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color || '#6366F1' }}
        />
        {icon && <DynamicIcon iconName={icon} />}
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
          {filteredTransactions.length === 0 && showReport ? (
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
                      <div className="text-2xl font-bold text-orange-500">
                        {formatCurrency(summary.pendingAmount)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Category/Expense Summary Section */}
                {selectedValue.startsWith('category_') && itemTotals.length > 0 && (
                  <Card className="mb-4">
                    <CardHeader>
                      <CardTitle>Expense Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Total Amount</TableHead>
                            <TableHead className="text-right">Paid Amount</TableHead>
                            <TableHead className="text-right">Pending Amount</TableHead>
                            <TableHead className="text-right">Paid Occurrences</TableHead>
                            <TableHead className="text-right">Pending Occurrences</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itemTotals.map((ct) => (
                            <TableRow key={ct.category}>
                              <TableCell>
                                <CategoryDisplay
                                  category={ct.category}
                                  color={ct.color}
                                  icon={ct.icon}
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(ct.total)}
                              </TableCell>
                              <TableCell className="text-right text-red-600">
                                {formatCurrency(ct.occurred)}
                              </TableCell>
                              <TableCell className="text-right text-orange-500">
                                {formatCurrency(ct.pending)}
                              </TableCell>
                              <TableCell className="text-right text-red-600">
                                {ct.occurredCount}
                              </TableCell>
                              <TableCell className="text-right text-orange-500">
                                {ct.pendingCount}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {selectedValue === "all_categories" && itemTotals.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Categories Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Total Amount</TableHead>
                            <TableHead className="text-right">Paid Amount</TableHead>
                            <TableHead className="text-right">Pending Amount</TableHead>
                            <TableHead className="text-right">Occurrences</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itemTotals.map((ct) => (
                            <TableRow key={ct.category}>
                              <TableCell>
                                <CategoryDisplay
                                  category={ct.category}
                                  color={ct.color}
                                  icon={ct.icon}
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(ct.total)}
                              </TableCell>
                              <TableCell className="text-right text-red-600">
                                {formatCurrency(ct.occurred)}
                              </TableCell>
                              <TableCell className="text-right text-orange-500">
                                {formatCurrency(ct.pending)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-red-600">{ct.occurredCount}</span>
                                {" / "}
                                <span className="text-orange-500">{ct.pendingCount}</span>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold">
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(summary.totalAmount)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {formatCurrency(summary.occurredAmount)}
                            </TableCell>
                            <TableCell className="text-right text-orange-500">
                              {formatCurrency(summary.pendingAmount)}
                            </TableCell>
                            <TableCell className="text-right">
                              {itemTotals.reduce((acc, ct) => acc + ct.occurredCount, 0)}
                              {" / "}
                              {itemTotals.reduce((acc, ct) => acc + ct.pendingCount, 0)}
                            </TableCell>
                          </TableRow>
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
                            <TableHead className="text-right w-[120px]">
                              Total Amount
                            </TableHead>
                            <TableHead className="text-right w-[120px]">
                              Paid Amount
                            </TableHead>
                            <TableHead className="text-right w-[120px]">
                              Pending Amount
                            </TableHead>
                            <TableHead className="text-right w-[100px]">
                              Occurrences
                              <div className="text-xs font-normal">Paid / Pending</div>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedExpenses.map((expense) => (
                            <TableRow key={expense.description}>
                              <TableCell className="font-medium">
                                {expense.description}
                              </TableCell>
                              <TableCell>
                                <CategoryDisplay
                                  category={expense.category}
                                  color={expense.color}
                                  icon={bills.find(b => b.category_name === expense.category)?.category_icon ?? null}
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(expense.totalAmount)}
                              </TableCell>
                              <TableCell className="text-right text-red-600">
                                {formatCurrency(expense.occurredAmount)}
                              </TableCell>
                              <TableCell className="text-right text-orange-500">
                                {formatCurrency(expense.pendingAmount)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-red-600">{expense.occurredCount}</span>
                                {" / "}
                                <span className="text-orange-500">{expense.pendingCount}</span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Individual Expense Details */}
                {selectedValue.startsWith('expense_') && itemTotals.length > 0 && (
                  <Card className="mb-4">
                    <CardHeader>
                      <CardTitle>Individual Expense Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Expense</TableHead>
                            <TableHead className="text-right">Total Amount</TableHead>
                            <TableHead className="text-right">Paid Amount</TableHead>
                            <TableHead className="text-right">Pending Amount</TableHead>
                            <TableHead className="text-right">Paid Occurrences</TableHead>
                            <TableHead className="text-right">Pending Occurrences</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itemTotals.map((expense) => (
                            <TableRow key={expense.category}>
                              <TableCell>
                                <CategoryDisplay
                                  category={expense.category}
                                  color={expense.color}
                                  icon={expense.icon}
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(expense.total)}
                              </TableCell>
                              <TableCell className="text-right text-red-600">
                                {formatCurrency(expense.occurred)}
                              </TableCell>
                              <TableCell className="text-right text-orange-500">
                                {formatCurrency(expense.pending)}
                              </TableCell>
                              <TableCell className="text-right text-red-600">
                                {expense.occurredCount}
                              </TableCell>
                              <TableCell className="text-right text-orange-500">
                                {expense.pendingCount}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {selectedValue !== "all" && selectedValue !== "all_categories" && !selectedValue.startsWith('expense_') && (
                  <div className="space-y-4">
                    {/* This section is intentionally left blank as the Category Details section has been removed */}
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