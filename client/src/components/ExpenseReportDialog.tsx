import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useState, useEffect, useMemo, useCallback } from 'react';
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

// Update the CategoryTotal interface to include transactions
interface CategoryTotal {
  category: string;
  total: number;
  occurred: number;
  pending: number;
  occurredCount: number;
  pendingCount: number;
  color: string;
  icon: string | null;
  transactions?: Transaction[];
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
  transactions: Transaction[];
}

interface ExpenseOccurrence {
  date: string;
  amount: number;
  status: 'occurred' | 'pending';
}

export default function ExpenseReportDialog({
  isOpen,
  onOpenChange,
  bills,
  transactions,
}: ExpenseReportDialogProps) {
  const [selectedValue, setSelectedValue] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>();
  const [showReport, setShowReport] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [previousReport, setPreviousReport] = useState<{ value: string, date: DateRange | undefined } | null>(null);
  const [generatedTransactions, setTransactions] = useState<Transaction[]>([]); // Added state for generated transactions
  const today = useMemo(() => dayjs(), []);

  // Add back handleBackToSelection function
  const handleBackToSelection = () => {
    setShowReport(false);
    setSelectedValue("all");
    setDate(undefined);
    setPreviousReport(null);
    setTransactions([]); //Clear generated transactions on back
  };

  // Force refresh when dialog opens
  useEffect(() => {
    //This section remains unchanged
  }, [isOpen]);


  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedValue("all");
      setDate(undefined);
      setShowReport(false);
      setDateError(null);
      setPreviousReport(null);
      setTransactions([]); //Clear generated transactions on close
    }
  }, [isOpen]);

  // Generate transactions when date range changes
  useEffect(() => {
    if (!showReport || !date?.from || !date?.to) return;

    const startDate = dayjs(date.from);
    const endDate = dayjs(date.to);
    const newGeneratedTransactions: Transaction[] = [];

    // Generate expense transactions from bills
    bills.forEach(bill => {
      let currentMonth = startDate.startOf('month');
      while (currentMonth.isSameOrBefore(endDate)) {
        const billDate = currentMonth.date(bill.day);
        if (billDate.isBetween(startDate, endDate, 'day', '[]')) {
          newGeneratedTransactions.push({
            id: `${bill.id}-${billDate.format('YYYY-MM-DD')}`,
            date: billDate.format('YYYY-MM-DD'),
            description: bill.name,
            amount: bill.amount,
            type: 'expense',
            category_name: bill.category_name,
            category_color: bill.category_color,
            category_icon: bill.category_icon || null,
            category_id: bill.category_id
          });
        }
        currentMonth = currentMonth.add(1, 'month');
      }
    });

    setTransactions(newGeneratedTransactions);
  }, [showReport, date?.from, date?.to, bills, today]);

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

  // Filter transactions based on date range
  const filteredTransactions = useMemo(() => {
    if (!date?.from || !date?.to) return [];

    return [...generatedTransactions, ...transactions].filter(t => { //Use both generated and original transactions
      const transactionDate = dayjs(t.date);
      return transactionDate.isSameOrAfter(dayjs(date.from)) &&
             transactionDate.isSameOrBefore(dayjs(date.to));
    });
  }, [generatedTransactions, transactions, date]);

  // Update groupedExpenses to properly track occurrences
  const groupedExpenses = useMemo(() => {
    if (!date?.from || !date?.to) return [];

    const groups: Record<string, GroupedExpense> = {};
    const startDate = dayjs(date.from);
    const endDate = dayjs(date.to);

    // First, process bills to ensure they're included
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

      // Track processed months to avoid duplicates
      const processedMonths = new Set<string>();

      // Get unique months between start and end date
      let currentDate = startDate.clone().startOf('month');
      const endMonth = endDate.clone().endOf('month');

      while (currentDate.isSameOrBefore(endMonth, 'month')) {
        const monthKey = currentDate.format('YYYY-MM');

        // Only process each month once
        if (!processedMonths.has(monthKey)) {
          processedMonths.add(monthKey);

          const billDate = currentDate.date(bill.day);

          // Only count if bill date falls within our date range
          if (billDate.isBetween(startDate, endDate, 'day', '[]')) {
            const entry = groups[key];
            const isOccurred = billDate.isSameOrBefore(today);

            // Update amounts based on occurrence
            if (isOccurred) {
              entry.occurredAmount += bill.amount;
              entry.occurredCount++;
            } else {
              entry.pendingAmount += bill.amount;
              entry.pendingCount++;
            }

            // Add transaction record
            entry.transactions.push({
              id: `${bill.id}-${billDate.format('YYYY-MM-DD')}`,
              date: billDate.format('YYYY-MM-DD'),
              description: bill.name,
              amount: bill.amount,
              type: 'expense',
              category_name: bill.category_name,
              category_color: bill.category_color,
              category_icon: bill.category_icon || null,
              category_id: bill.category_id
            });
          }
        }
        currentDate = currentDate.add(1, 'month');
      }

      // Update total amount after processing all occurrences
      const entry = groups[key];
      entry.totalAmount = entry.occurredAmount + entry.pendingAmount;
    });

    // Then process any actual transactions that aren't covered by bills
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const key = transaction.description;
        const transactionMonth = dayjs(transaction.date).format('YYYY-MM');

        // Skip if this transaction is already accounted for in bills for this month
        if (groups[key] && groups[key].transactions.some(t => 
          dayjs(t.date).format('YYYY-MM') === transactionMonth
        )) {
          return;
        }

        if (!groups[key]) {
          groups[key] = {
            description: key,
            category: transaction.category_name,
            totalAmount: 0,
            occurredAmount: 0,
            pendingAmount: 0,
            occurredCount: 0,
            pendingCount: 0,
            color: transaction.category_color,
            transactions: []
          };
        }

        const entry = groups[key];
        const isOccurred = dayjs(transaction.date).isSameOrBefore(today);

        // Update amounts and counts
        if (isOccurred) {
          entry.occurredAmount += transaction.amount;
          entry.occurredCount++;
        } else {
          entry.pendingAmount += transaction.amount;
          entry.pendingCount++;
        }

        entry.totalAmount = entry.occurredAmount + entry.pendingAmount;
        entry.transactions.push(transaction);
      });

    return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [bills, filteredTransactions, date, today]);

  // Update itemTotals to properly handle both expenses and incomes
  const itemTotals = useMemo(() => {
    if (!date?.from || !date?.to) return [];

    console.log('Date range:', {
      from: date.from,
      to: date.to,
      transactions: filteredTransactions,
      selectedValue
    });

    const startDate = dayjs(date.from).startOf('month');
    const endDate = dayjs(date.to).endOf('month');

    // Handle individual expense view
    if (selectedValue.startsWith('expense_')) {
      const billId = selectedValue.replace('expense_', '');
      const bill = bills.find(b => b.id.toString() === billId);
      if (!bill) return [];

      // Calculate monthly occurrences within date range
      const occurrences: { date: string; isPaid: boolean }[] = [];
      let currentMonth = dayjs(date.from).startOf('month');
      const endMonth = dayjs(date.to).endOf('month');

      while (currentMonth.isSameOrBefore(endMonth, 'month')) {
        const billDate = currentMonth.date(bill.day);

        // Only include if bill date falls within our date range
        if (billDate.isSameOrAfter(dayjs(date.from).startOf('day')) &&
            billDate.isSameOrBefore(dayjs(date.to).endOf('day'))) {

          // A bill is considered paid if it's before or equal to today
          const isPaid = billDate.isSameOrBefore(dayjs(), 'day');

          occurrences.push({
            date: billDate.format('YYYY-MM-DD'),
            isPaid
          });
        }
        currentMonth = currentMonth.add(1, 'month');
      }

      const occurredOccurrences = occurrences.filter(o => o.isPaid);
      const pendingOccurrences = occurrences.filter(o => !o.isPaid);

      // Get actual transactions for this bill within date range
      const billTransactions = filteredTransactions
        .filter(t => t.description.toLowerCase().trim() === bill.name.toLowerCase().trim())
        .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());

      return [{
        category: bill.name,
        total: bill.amount * occurrences.length,
        occurred: bill.amount * occurredOccurrences.length,
        pending: bill.amount * pendingOccurrences.length,
        occurredCount: occurredOccurrences.length,
        pendingCount: pendingOccurrences.length,
        color: bill.category_color || '#D3D3D3',
        icon: bill.category_icon || null,
        transactions: billTransactions.length > 0 ? billTransactions : occurrences.map(o => ({
          id: `${bill.id}-${o.date}`,
          date: o.date,
          description: bill.name,
          amount: bill.amount,
          type: 'expense' as const,
          category_name: bill.category_name,
          category_color: bill.category_color,
          category_icon: bill.category_icon || null,
          category_id: bill.category_id
        }))
      }];
    }
    // Handle all categories combined
    else if (selectedValue === "all_categories") {
      const totals: Record<string, CategoryTotal> = {};

      // Process all transactions first
      filteredTransactions.forEach(transaction => {
        const categoryName = transaction.category_name;

        if (!totals[categoryName]) {
          totals[categoryName] = {
            category: categoryName,
            total: 0,
            occurred: 0,
            pending: 0,
            occurredCount: 0,
            pendingCount: 0,
            color: transaction.category_color,
            icon: transaction.category_icon,
            transactions: []
          };
        }

        const entry = totals[categoryName];
        const isOccurred = dayjs(transaction.date).isSameOrBefore(today);

        if (isOccurred) {
          entry.occurred += transaction.amount;
          entry.occurredCount++;
        } else {
          entry.pending += transaction.amount;
          entry.pendingCount++;
        }

        entry.transactions?.push(transaction);
      });

      // Process bills for future occurrences
      bills.forEach(bill => {
        let currentMonth = startDate.clone();

        while (currentMonth.isSameOrBefore(endDate)) {
          const billDate = currentMonth.date(bill.day);

          if (billDate.isSameOrAfter(startDate) &&
              billDate.isSameOrBefore(endDate)) {
            const entry = totals[bill.category_name];
            const isOccurred = billDate.isSameOrBefore(today);

            // Only add if we don't have a matching transaction
            const hasMatchingTransaction = entry?.transactions?.some(t =>
              dayjs(t.date).format('YYYY-MM-DD') === billDate.format('YYYY-MM-DD') &&
              t.description === bill.name
            );

            if (!hasMatchingTransaction) {
              if (!entry) {
                totals[bill.category_name] = {
                  category: bill.category_name,
                  total: bill.amount,
                  occurred: isOccurred ? bill.amount : 0,
                  pending: isOccurred ? 0 : bill.amount,
                  occurredCount: isOccurred ? 1 : 0,
                  pendingCount: isOccurred ? 0 : 1,
                  color: bill.category_color,
                  icon: bill.category_icon,
                  transactions: []
                };
              } else {
                if (isOccurred) {
                  entry.occurred += bill.amount;
                  entry.occurredCount++;
                } else {
                  entry.pending += bill.amount;
                  entry.pendingCount++;
                }
              }
            }
          }
          currentMonth = currentMonth.add(1, 'month');
        }
      });

      // Calculate totals
      Object.values(totals).forEach(entry => {
        entry.total = entry.occurred + entry.pending;
        if (entry.transactions) {
          entry.transactions.sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
        }
      });

      return Object.values(totals)
        .sort((a, b) => b.total - a.total)
        .filter(entry => entry.total > 0);
    }
    // Handle all expenses combined
    else if (selectedValue === "all") {
      const totals: Record<string, CategoryTotal> = {};
      const processedTransactions = new Set<string>();

      // Process actual transactions first
      filteredTransactions
        .filter(t => {
          const transactionDate = dayjs(t.date);
          return transactionDate.isSameOrAfter(startDate) &&
                 transactionDate.isSameOrBefore(endDate) &&
                 t.type === 'expense';
        })
        .forEach(transaction => {
          const categoryName = transaction.category_name;

          if (!totals[categoryName]) {
            totals[categoryName] = {
              category: categoryName,
              total: 0,
              occurred: 0,
              pending: 0,
              occurredCount: 0,
              pendingCount: 0,
              color: transaction.category_color,
              icon: transaction.category_icon,
              transactions: []
            };
          }

          const entry = totals[categoryName];
          const isOccurred = dayjs(transaction.date).isSameOrBefore(today);

          if (isOccurred) {
            entry.occurred += transaction.amount;
            entry.occurredCount++;
          } else {
            entry.pending += transaction.amount;
            entry.pendingCount++;
          }

          entry.transactions?.push(transaction);
        });

      // Then add any upcoming bills
      bills.forEach(bill => {
        let currentMonth = startDate.clone();

        while (currentMonth.isSameOrBefore(endDate)) {
          const billDate = currentMonth.date(bill.day);

          if (billDate.isSameOrAfter(startDate) && billDate.isSameOrBefore(endDate)) {
            // Check if we already have a transaction for this bill on this date
            const hasTransaction = filteredTransactions.some(t =>
              t.description === bill.name &&
              dayjs(t.date).format('YYYY-MM-DD') === billDate.format('YYYY-MM-DD')
            );

            if (!hasTransaction) {
              const categoryName = bill.category_name;

              if (!totals[categoryName]) {
                totals[categoryName] = {
                  category: categoryName,
                  total: 0,
                  occurred: 0,
                  pending: 0,
                  occurredCount: 0,
                  pendingCount: 0,
                  color: bill.category_color,
                  icon: bill.category_icon,
                  transactions: []
                };
              }

              const entry = totals[categoryName];
              const isOccurred = billDate.isSameOrBefore(today);

              if (isOccurred) {
                entry.occurred += bill.amount;
                entry.occurredCount++;
              } else {
                entry.pending += bill.amount;
                entry.pendingCount++;
              }

              entry.transactions?.push({
                id: `${bill.id}-${billDate.format('YYYY-MM-DD')}`,
                date: billDate.format('YYYY-MM-DD'),
                description: bill.name,
                amount: bill.amount,
                type: 'expense',
                category_name: bill.category_name,
                category_color: bill.category_color,
                category_icon: bill.category_icon || null,
                category_id: bill.category_id
              });
            }
          }
          currentMonth = currentMonth.add(1, 'month');
        }
      });

      // Calculate totals
      Object.values(totals).forEach(entry => {
        entry.total = entry.occurred + entry.pending;
        if (entry.transactions) {
          entry.transactions.sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
        }
      });

      return Object.values(totals)
        .sort((a, b) => b.total - a.total)
        .filter(entry => entry.total > 0);
    }
    // Handle all expenses combined
    else if (selectedValue === "all_categories") {
      const totals: Record<string, CategoryTotal> = {};

      // Process all transactions first
      filteredTransactions.forEach(transaction => {
        const categoryName = transaction.category_name;

        if (!totals[categoryName]) {
          totals[categoryName] = {
            category: categoryName,
            total: 0,
            occurred: 0,
            pending: 0,
            occurredCount: 0,
            pendingCount: 0,
            color: transaction.category_color,
            icon: transaction.category_icon,
            transactions: []
          };
        }

        const entry = totals[categoryName];
        const isOccurred = dayjs(transaction.date).isSameOrBefore(today);

        if (isOccurred) {
          entry.occurred += transaction.amount;
          entry.occurredCount++;
        } else {
          entry.pending += transaction.amount;
          entry.pendingCount++;
        }

        entry.transactions?.push(transaction);
      });

      // Process bills for future occurrences
      bills.forEach(bill => {
        let currentMonth = startDate.clone();

        while (currentMonth.isSameOrBefore(endDate)) {
          const billDate = currentMonth.date(bill.day);

          if (billDate.isSameOrAfter(startDate) &&
              billDate.isSameOrBefore(endDate)) {
            const entry = totals[bill.category_name];
            const isOccurred = billDate.isSameOrBefore(today);

            // Only add if we don't have a matching transaction
            const hasMatchingTransaction = entry?.transactions?.some(t =>
              dayjs(t.date).format('YYYY-MM-DD') === billDate.format('YYYY-MM-DD') &&
              t.description === bill.name
            );

            if (!hasMatchingTransaction) {
              if (!entry) {
                totals[bill.category_name] = {
                  category: bill.category_name,
                  total: bill.amount,
                  occurred: isOccurred ? bill.amount : 0,
                  pending: isOccurred ? 0 : bill.amount,
                  occurredCount: isOccurred ? 1 : 0,
                  pendingCount: isOccurred ? 0 : 1,
                  color: bill.category_color,
                  icon: bill.category_icon,
                  transactions: []
                };
              } else {
                if (isOccurred) {
                  entry.occurred += bill.amount;
                  entry.occurredCount++;
                } else {
                  entry.pending += bill.amount;
                  entry.pendingCount++;
                }
              }
            }
          }
          currentMonth = currentMonth.add(1, 'month');
        }
      });

      // Calculate totals
      Object.values(totals).forEach(entry => {
        entry.total = entry.occurred + entry.pending;
        if (entry.transactions) {
          entry.transactions.sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
        }
      });

      return Object.values(totals)
        .sort((a, b) => b.total - a.total)
        .filter(entry => entry.total > 0);
    }

    return [];
  }, [bills, selectedValue, date, today, filteredTransactions]);

  // Update summary calculations
  const summary = useMemo(() => {
    if (!date?.from || !date?.to || itemTotals.length === 0) {
      return {
        title: "",
        totalAmount: 0,
        occurredAmount: 0,
        pendingAmount: 0
      };
    }

    // Get title based on selection type
    let title = "";
    if (selectedValue.startsWith('expense_')) {
      const billId = selectedValue.replace('expense_', '');
      const bill = bills.find(b => b.id.toString() === billId);
      if (bill) {
        title = `${bill.name}`; // Corrected title
      }
    } else if (selectedValue === "all") {
      title = "All Expenses Combined";
    } else if (selectedValue === "all_categories") {
      title = "All Categories Combined";
    } else if (selectedValue.startsWith('category_')) {
      title = `${selectedValue.replace('category_', '')} Category`;
    }

    return {
      title,
      totalAmount: itemTotals.reduce((sum, item) => sum + item.total, 0),
      occurredAmount: itemTotals.reduce((sum, item) => sum + item.occurred, 0),
      pendingAmount: itemTotals.reduce((sum, item) => sum + item.pending, 0)
    };
  }, [selectedValue, date, itemTotals, bills]);

  const getDialogTitle = () => {
    if (selectedValue === "all") return "All Expenses Combined";
    if (selectedValue === "all_categories") return "All Categories Combined";
    if (selectedValue.startsWith('expense_')) {
      const billId = selectedValue.replace('expense_', '');
      const bill = bills.find(b => b.id === billId);
      if (bill) {
        return (
          `${bill.name}` // Corrected title
        );
      }
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
                      <SelectItem
                        key={`category_${category}`}
                        value={`category_${category}`}
                        className="text-blue-600"
                      >
                        {category}
                      </SelectItem>
                    ))}
                  </SelectGroup>

                  {/* Individual Expenses */}
                  <SelectGroup>
                    <SelectLabel>Individual Expenses</SelectLabel>
                    {bills.map((bill) => (
                      <SelectItem
                        key={`expense_${bill.id}`}
                        value={`expense_${bill.id}`}
                        className="text-green-600"
                      >
                        {bill.name}
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
                {summary.title}
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
              <AlertCircle className="h-4 w4" />
              <AlertDescription>
                {bills.length ===0
                  ? "No bills have been added yet. Please add some bills to generate a report."
                  : "No transactions found for the selected date range and filters."}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid gap-4 mb-4">
                {/* Main Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedValue.startsWith('expense_') && (
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-lg">
                              <CategoryDisplay
                                category={bills.find(b => b.id.toString() === selectedValue.replace('expense_', ''))?.category_name || 'Uncategorized'}
                                color={bills.find(b => b.id.toString() === selectedValue.replace('expense_', ''))?.category_color || '#D3D3D3'}
                                icon={bills.find(b => b.id.toString() === selectedValue.replace('expense_', ''))?.category_icon || null}
                              />
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Monthly Amount: {formatCurrency(bills.find(b => b.id.toString() === selectedValue.replace('expense_', ''))?.amount || 0)}
                            </div>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* Transaction Summary Table */}
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
                              {itemTotals[0]?.transactions
                                ?.sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
                                .map((transaction) => (
                                  <TableRow key={`${transaction.id}-${transaction.date}`}>
                                    <TableCell>
                                      {dayjs(transaction.date).format('MMM D, YYYY')}
                                    </TableCell>
                                    <TableCell>{transaction.description}</TableCell>
                                    <TableCell className={`text-right font-medium ${
                                      dayjs(transaction.date).isSameOrBefore(today)
                                        ? 'text-red-600'
                                        : 'text-orange-500'
                                    }`}>
                                      {formatCurrency(transaction.amount)}
                                    </TableCell>
                                    <TableCell>
                                      {dayjs(transaction.date).isSameOrBefore(today) ? (
                                        <span className="text-red-600">Paid</span>
                                      ) : (
                                        <span className="text-orange-500">Pending</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
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
                              <TableCell><CategoryDisplay
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
                              <TableCell className="text-right textorange-500">
                                {formatCurrency(ct.pending)}
                              </TableCell>
                              <TableCell className="text-right text-red-600">{ct.occurredCount}
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

                {/* Category Transaction Details Section */}
                {selectedValue.startsWith('category_') && itemTotals.length > 0 && (
                  <Card className="mb-4">
                    <CardHeader>
                      <CardTitle>Transaction Details</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                          {itemTotals[0]?.transactions
                            ?.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
                            .map((transaction) => (
                              <TableRow key={`${transaction.id}-${transaction.date}`}>
                                <TableCell>
                                  {dayjs(transaction.date).format('MMM D, YYYY')}
                                </TableCell>
                                <TableCell>{transaction.description}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(transaction.amount)}
                                </TableCell>
                                <TableCell>
                                  {dayjs(transaction.date).isSameOrBefore(today) ? (
                                    <span className="text-red-600">Paid</span>
                                  ) : (
                                    <span className="text-orange-500">Pending</span>
                                  )}
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
                  <Card>
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
                              <TableCell className="text-right text-orange-500">{formatCurrency(expense.pendingAmount)}
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

                {selectedValue.startsWith('expense_') && itemTotals.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex flex-col space-y-2">
                        <div className="text-xl font-semibold">
                          {bills.find(b => b.id === selectedValue.replace('expense_', ''))?.name}
                        </div>
                        <div className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                          <CategoryDisplay
                            category={itemTotals[0].category}
                            color={itemTotals[0].color}
                            icon={itemTotals[0].icon}
                          />
                          <span className="text-foreground">
                            {formatCurrency(bills.find(b => b.id === selectedValue.replace('expense_', ''))?.amount || 0)} per month
                          </span>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Description</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {itemTotals[0]?.transactions
                              ?.sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
                              .map((transaction) => (
                                <TableRow key={`${transaction.date}-${transaction.description}`}>
                                  <TableCell>
                                    {dayjs(transaction.date).format('MMM D, YYYY')}
                                  </TableCell>
                                  <TableCell className={`text-right font-medium ${
                                    dayjs(transaction.date).isSameOrBefore(today)
                                      ? 'text-red-600'
                                      : 'text-orange-500'
                                  }`}>
                                    {formatCurrency(transaction.amount)}
                                  </TableCell>
                                  <TableCell>
                                    {dayjs(transaction.date).isSameOrBefore(today) ? (
                                      <span className="text-red-600">Paid</span>
                                    ) : (
                                      <span className="text-orange-500">Pending</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {transaction.description}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {selectedValue !== "all" && selectedValue !== "all_categories" && !selectedValue.startsWith('expense_') && (
                  <div className="space-y-4">
                    {/* Category Details section removed as specified */}
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