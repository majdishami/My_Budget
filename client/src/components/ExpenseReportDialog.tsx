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

export default function ExpenseReportDialog({ isOpen, onOpenChange, bills }: ExpenseReportDialogProps) {
  const [selectedValue, setSelectedValue] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>();
  const [showReport, setShowReport] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [previousReport, setPreviousReport] = useState<{ value: string, date: DateRange | undefined } | null>(null);
  const today = useMemo(() => dayjs(), []);

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

  // Calculate expected occurrences within date range
  const calculateExpectedOccurrences = (bill: Bill, startDate: Date, endDate: Date) => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const billDay = bill.day;

    let currentDate = start.date(billDay);
    if (currentDate.isBefore(start)) {
      currentDate = currentDate.add(1, 'month');
    }

    let occurrences = 0;
    while (currentDate.isSameOrBefore(end)) {
      occurrences++;
      currentDate = currentDate.add(1, 'month');
    }

    return occurrences;
  };

  // Update filteredTransactions to include expected occurrences
  const filteredTransactions = useMemo(() => {
    if (!showReport || !date?.from || !date?.to) return [];

    let filtered = transactions.filter(t => {
      const transactionDate = dayjs(t.date);
      const fromDate = dayjs(date.from);
      const toDate = dayjs(date.to);
      return transactionDate.isSameOrAfter(fromDate, 'day') && 
             transactionDate.isSameOrBefore(toDate, 'day');
    });

    // Add expected occurrences for bills within the date range
    if (selectedValue.startsWith('expense_')) {
      const billId = selectedValue.replace('expense_', '');
      const selectedBill = bills.find(b => String(b.id) === billId);

      if (selectedBill) {
        const expectedOccurrences = calculateExpectedOccurrences(selectedBill, date.from, date.to);
        const actualOccurrences = filtered.length;
        const remainingOccurrences = expectedOccurrences - actualOccurrences;

        // Add projected transactions for remaining occurrences
        if (remainingOccurrences > 0) {
          let currentDate = dayjs(date.from).date(selectedBill.day);
          while (currentDate.isSameOrBefore(dayjs(date.to))) {
            // Only add if there's no actual transaction on this date
            const existingTransaction = filtered.find(t => 
              dayjs(t.date).format('YYYY-MM-DD') === currentDate.format('YYYY-MM-DD')
            );

            if (!existingTransaction) {
              filtered.push({
                id: `projected-${currentDate.format('YYYY-MM-DD')}`,
                date: currentDate.format('YYYY-MM-DD'),
                description: `${selectedBill.name} (Projected)`,
                amount: selectedBill.amount,
                type: 'expense',
                category_name: selectedBill.category_name,
                category_color: selectedBill.category_color,
                category_icon: selectedBill.category_icon,
                category_id: selectedBill.category_id
              });
            }
            currentDate = currentDate.add(1, 'month');
          }
        }
      }
    }

    if (selectedValue.startsWith('category_')) {
      const categoryName = selectedValue.replace('category_', '');
      filtered = filtered.filter(t => 
        t.category_name.toLowerCase() === categoryName.toLowerCase()
      );

      // Add projected transactions for bills in this category
      const categoryBills = bills.filter(b => 
        b.category_name.toLowerCase() === categoryName.toLowerCase()
      );

      categoryBills.forEach(bill => {
        const expectedOccurrences = calculateExpectedOccurrences(bill, date.from, date.to);
        const actualOccurrences = filtered.filter(t => 
          t.description.toLowerCase().includes(bill.name.toLowerCase())
        ).length;
        const remainingOccurrences = expectedOccurrences - actualOccurrences;

        if (remainingOccurrences > 0) {
          let currentDate = dayjs(date.from).date(bill.day);
          while (currentDate.isSameOrBefore(dayjs(date.to))) {
            const existingTransaction = filtered.find(t => 
              dayjs(t.date).format('YYYY-MM-DD') === currentDate.format('YYYY-MM-DD') &&
              t.description.toLowerCase().includes(bill.name.toLowerCase())
            );

            if (!existingTransaction) {
              filtered.push({
                id: `projected-${bill.id}-${currentDate.format('YYYY-MM-DD')}`,
                date: currentDate.format('YYYY-MM-DD'),
                description: `${bill.name} (Projected)`,
                amount: bill.amount,
                type: 'expense',
                category_name: bill.category_name,
                category_color: bill.category_color,
                category_icon: bill.category_icon,
                category_id: bill.category_id
              });
            }
            currentDate = currentDate.add(1, 'month');
          }
        }
      });
    }

    return filtered.sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  }, [showReport, date, selectedValue, transactions, bills]);

  // Group transactions by expense name for the "all" view
  const groupedExpenses = useMemo(() => {
    if (selectedValue !== "all") return [];

    const groups: Record<string, GroupedExpense> = {};

    filteredTransactions.forEach(transaction => {
      if (!groups[transaction.description]) {
        groups[transaction.description] = {
          description: transaction.description,
          category: transaction.category_name,
          totalAmount: 0,
          occurredAmount: 0,
          pendingAmount: 0,
          color: transaction.category_color || '#D3D3D3',
          transactions: [],
          occurredCount: 0,
          pendingCount: 0
        };
      }

      const group = groups[transaction.description];
      group.totalAmount += transaction.amount;
      if (dayjs(transaction.date).isSameOrBefore(today)) {
        group.occurredAmount += transaction.amount;
        group.occurredCount++;
      } else {
        group.pendingAmount += transaction.amount;
        group.pendingCount++;
      }
      group.transactions.push(transaction);
    });

    return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredTransactions, selectedValue, today]);

  // Update summary calculations to include all expected occurrences
  const summary = useMemo(() => {
    if (!filteredTransactions.length || !date?.from || !date?.to) return {
      totalAmount: 0,
      occurredAmount: 0,
      pendingAmount: 0
    };

    // Calculate totals from actual transactions
    const actualTotal = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const occurredAmount = filteredTransactions
      .filter(t => dayjs(t.date).isSameOrBefore(today))
      .reduce((sum, t) => sum + t.amount, 0);
    const pendingAmount = filteredTransactions
      .filter(t => dayjs(t.date).isAfter(today))
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate expected occurrences for all bills within date range
    let projectedAmount = 0;
    bills.forEach(bill => {
      const expectedOccurrences = calculateExpectedOccurrences(bill, date.from!, date.to!);
      const actualOccurrences = filteredTransactions.filter(t => 
        t.description.toLowerCase().includes(bill.name.toLowerCase())
      ).length;

      if (actualOccurrences < expectedOccurrences) {
        const remainingOccurrences = expectedOccurrences - actualOccurrences;
        projectedAmount += bill.amount * remainingOccurrences;
      }
    });

    return {
      totalAmount: actualTotal + projectedAmount,
      occurredAmount,
      pendingAmount: pendingAmount + projectedAmount
    };
  }, [filteredTransactions, date, today, bills, calculateExpectedOccurrences]);

  // Group transactions by month
  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce((groups: Record<string, Transaction[]>, transaction) => {
      const monthKey = dayjs(transaction.date).format('YYYY-MM');
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(transaction);
      return groups;
    }, {});
  }, [filteredTransactions]);

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

  // Update itemTotals for category summaries to include all expected occurrences
  const itemTotals = useMemo(() => {
    if (!filteredTransactions.length || !date?.from || !date?.to) return [];

    if (selectedValue === "all_categories") {
      const totals: Record<string, CategoryTotal> = {};

      // First, initialize totals for all categories that have bills
      bills.forEach(bill => {
        if (!totals[bill.category_name]) {
          totals[bill.category_name] = {
            category: bill.category_name,
            total: 0,
            occurred: 0,
            pending: 0,
            occurredCount: 0,
            pendingCount: 0,
            color: bill.category_color
          };
        }
      });

      // Add all actual transactions
      filteredTransactions.forEach(t => {
        if (!totals[t.category_name]) {
          totals[t.category_name] = {
            category: t.category_name,
            total: 0,
            occurred: 0,
            pending: 0,
            occurredCount: 0,
            pendingCount: 0,
            color: t.category_color
          };
        }

        const entry = totals[t.category_name];
        entry.total += t.amount;

        if (dayjs(t.date).isSameOrBefore(today)) {
          entry.occurred += t.amount;
          entry.occurredCount++;
        } else {
          entry.pending += t.amount;
          entry.pendingCount++;
        }
      });

      // Add expected occurrences for each category's bills
      bills.forEach(bill => {
        const expectedOccurrences = calculateExpectedOccurrences(bill, date!.from!, date!.to!);
        const actualOccurrences = filteredTransactions.filter(t => 
          t.category_name === bill.category_name && 
          t.description.toLowerCase().includes(bill.name.toLowerCase())
        ).length;

        if (actualOccurrences < expectedOccurrences) {
          const remainingOccurrences = expectedOccurrences - actualOccurrences;
          const projectedAmount = bill.amount * remainingOccurrences;

          const entry = totals[bill.category_name];
          entry.total += projectedAmount;
          entry.pending += projectedAmount;
          entry.pendingCount += remainingOccurrences;
        }
      });

      return Object.values(totals).sort((a, b) => b.total - a.total);
    } else if (selectedValue === "all") {
      // Update expense grouping to include expected occurrences
      const totals: Record<string, GroupedExpense> = {};

      // First initialize totals for all bills
      bills.forEach(bill => {
        if (!totals[bill.name]) {
          totals[bill.name] = {
            description: bill.name,
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
      });

      // Add actual transactions
      filteredTransactions.forEach(t => {
        if (!totals[t.description]) {
          totals[t.description] = {
            description: t.description,
            category: t.category_name,
            totalAmount: 0,
            occurredAmount: 0,
            pendingAmount: 0,
            occurredCount: 0,
            pendingCount: 0,
            color: t.category_color,
            transactions: []
          };
        }

        const entry = totals[t.description];
        entry.totalAmount += t.amount;
        entry.transactions.push(t);

        if (dayjs(t.date).isSameOrBefore(today)) {
          entry.occurredAmount += t.amount;
          entry.occurredCount++;
        } else {
          entry.pendingAmount += t.amount;
          entry.pendingCount++;
        }
      });

      // Add expected occurrences for each bill
      bills.forEach(bill => {
        const expectedOccurrences = calculateExpectedOccurrences(bill, date!.from!, date!.to!);
        const actualOccurrences = filteredTransactions.filter(t => 
          t.description.toLowerCase().includes(bill.name.toLowerCase())
        ).length;

        if (actualOccurrences < expectedOccurrences) {
          const remainingOccurrences = expectedOccurrences - actualOccurrences;
          const projectedAmount = bill.amount * remainingOccurrences;

          const entry = totals[bill.name];
          entry.totalAmount += projectedAmount;
          entry.pendingAmount += projectedAmount;
          entry.pendingCount += remainingOccurrences;
        }
      });

      return Object.values(totals).sort((a, b) => b.totalAmount - a.totalAmount);
    } else if (selectedValue.startsWith('category_')) {
      // Individual category totals logic with expected occurrences
      const selectedCategoryName = selectedValue.replace('category_', '');
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

      // First add all actual transactions
      const categoryTransactions = filteredTransactions.filter(t =>
        t.category_name.toLowerCase() === selectedCategoryName.toLowerCase()
      );

      categoryTransactions.forEach(t => {
        if (!totals[t.description]) {
          totals[t.description] = {
            description: t.description,
            category: t.category_name,
            total: 0,
            occurred: 0,
            pending: 0,
            occurredCount: 0,
            pendingCount: 0,
            color: t.category_color || '#D3D3D3'
          };
        }

        const entry = totals[t.description];
        entry.total += t.amount;

        if (dayjs(t.date).isSameOrBefore(today)) {
          entry.occurred += t.amount;
          entry.occurredCount++;
        } else {
          entry.pending += t.amount;
          entry.pendingCount++;
        }
      });

      // Then add expected occurrences for bills in this category
      const categoryBills = bills.filter(b => 
        b.category_name.toLowerCase() === selectedCategoryName.toLowerCase()
      );

      categoryBills.forEach(bill => {
        const expectedOccurrences = calculateExpectedOccurrences(bill, date!.from!, date!.to!);
        const actualOccurrences = categoryTransactions.filter(t => 
          t.description.toLowerCase().includes(bill.name.toLowerCase())
        ).length;

        if (!totals[bill.name]) {
          totals[bill.name] = {
            description: bill.name,
            category: selectedCategoryName,
            total: 0,
            occurred: 0,
            pending: 0,
            occurredCount: 0,
            pendingCount: 0,
            color: bill.category_color || '#D3D3D3'
          };
        }

        if (actualOccurrences < expectedOccurrences) {
          const remainingOccurrences = expectedOccurrences - actualOccurrences;
          const projectedAmount = bill.amount * remainingOccurrences;

          totals[bill.name].total += projectedAmount;
          totals[bill.name].pending += projectedAmount;
          totals[bill.name].pendingCount += remainingOccurrences;
        }
      });

      return Object.values(totals).sort((a, b) => b.total - a.total);
    }

    return [];
  }, [filteredTransactions, selectedValue, date, today, bills, calculateExpectedOccurrences]);

  // Update where we handle the bill ID in the dialog title
  const getDialogTitle = () => {
    if (selectedValue === "all") return "All Expenses Combined";
    if (selectedValue === "all_categories") return "All Categories Combined";
    if (selectedValue.startsWith('expense_')) {
      const billId = selectedValue.replace('expense_', '');
      return bills.find(b => b.id === billId)?.name || "Expense Report";
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
                          {itemTotals.map((ct: CategoryTotal) => (
                            <TableRow key={ct.category}>
                              <TableCell>
                                <CategoryDisplay
                                  category={ct.category}
                                  color={ct.color}
                                  icon={bills.find(b => b.category_name === ct.category)?.category?.icon ?? null}
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
                                <CategoryDisplay
                                  category={expense.category}
                                  color={expense.color}
                                  icon={bills.find(b => b.category_name === expense.category)?.category_icon ?? null}
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(expense.totalAmount / expense.transactions.length)}
                              </TableCell>
                              <TableCell>
                                <div className="text-right font-medium">
                                  {formatCurrency(expense.totalAmount)}
                                </div>
                                <div className="text-right text-xs">
                                  <span className="text-red-600 font-medium">
                                    {formatCurrency(expense.occurredAmount)}</span>
                                  {" / "}
                                  <span className="text-orange-500">
                                    {formatCurrency(expense.pendingAmount)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-right font-medium">
                                  {expense.occurredCount + expense.pendingCount}
                                </div>
                                <div className="text-right text-xs">
                                  <span className="text-red-600 font-medium">
                                    {expense.occurredCount}</span>
                                  {" / "}
                                  <span className="text-orange-500">
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
                            <TableHead className="textright">Paid Occurrences</TableHead>
                            <TableHead className="text-right">Pending Occurrences</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itemTotals.map((item: any) => (
                            <TableRow key={item.description}>
                              <TableCell>{item.description}</TableCell>
                              <TableCell>
                                <CategoryDisplay
                                  category={item.category}
                                  color={item.color || '#D3D3D3'}
                                  icon={bills.find(b => b.category_name === item.category)?.category?.icon ?? null}
                                />
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
                              <TableCell className="text-right text-orange-500">
                                {formatCurrency(item.pending)}
                              </TableCell>
                              <TableCell className="text-right text-red-600">
                                {item.occurredCount}
                              </TableCell>
                              <TableCell className="text-right text-orange-500">
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
                      const monthTransactions= groupedTransactions[monthKey] || [];
                      const monthlyTotal = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
                      const monthlyPaid = monthTransactions
                        .filter(t => dayjs(t.date).isSameOrBefore(today))
                        .reduce((sum, t)=> sum + t.amount, 0);

                      return (
                        <Card key={monthKey}>
                          <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium">
                              {dayjs(monthKey).format('MMMM YYYY')}
                            </CardTitle>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Total for month:</span>
                                <span className="text-red-600">{formatCurrency(monthlyTotal)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Paid to date:</span>
                                <span className="text-red-600">{formatCurrency(monthlyPaid)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Remaining:</span>
                                <span className="text-orange-500">
                                  {formatCurrency(monthlyTotal - monthlyPaid)}
                                </span>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead>Category</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {monthTransactions.map((transaction, i) => (
                                  <TableRow key={i}>
                                    <TableCell>{dayjs(transaction.date).format('MMM D')}</TableCell>
                                    <TableCell>{transaction.description}</TableCell>
                                    <TableCell>
                                      <CategoryDisplay
                                        category={transaction.category_name}
                                        color={transaction.category_color}
                                        icon={bills.find(b => b.category_name === transaction.category_name)?.category_icon ?? null}
                                      />
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(transaction.amount)}
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
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}