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

export default function ExpenseReportDialog({ isOpen, onOpenChange, bills }: ExpenseReportDialogProps) {
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

  //This function is not used anymore.
  // const calculateExpectedOccurrences = (bill: Bill, startDate: Date, endDate: Date) => {
  //   const start = dayjs(startDate);
  //   const end = dayjs(endDate);
  //   const billDay = bill.day;

  //   let currentDate = start.date(billDay);
  //   // If we've passed the bill day this month, start from next month
  //   if (currentDate.isBefore(start)) {
  //     currentDate = currentDate.add(1, 'month');
  //   }

  //   let occurrences = 0;
  //   while (currentDate.isSameOrBefore(end)) {
  //     occurrences++;
  //     currentDate = currentDate.add(1, 'month');
  //   }

  //   return occurrences;
  // };

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

    // Process transactions within date range
    filteredTransactions.forEach(t => {
      const transactionDate = dayjs(t.date);

      // Skip transactions outside the date range
      if (!transactionDate.isBetween(dateFrom, dateTo, 'day', '[]')) {
        return;
      }

      const key = t.description;
      if (!groups[key]) {
        groups[key] = {
          description: key,
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

      const entry = groups[key];
      // A transaction is "occurred" if it's before or equal to today
      const isOccurred = transactionDate.isSameOrBefore(today, 'day');

      entry.totalAmount += t.amount;
      entry.transactions.push(t);

      if (isOccurred) {
        entry.occurredAmount += t.amount;
        entry.occurredCount++;
      } else {
        entry.pendingAmount += t.amount;
        entry.pendingCount++;
      }
    });

    // For each category, check if there are any transactions in the category
    // that occur in between any two dates in the date range
    Object.values(groups).forEach(group => {
      // Get all transaction dates for this group
      const allDates = group.transactions.map(t => dayjs(t.date));

      // Sort dates chronologically
      allDates.sort((a, b) => a.valueOf() - b.valueOf());

      if (allDates.length > 0) {
        // Determine the payment day (e.g., 1st of the month for rent)
        const paymentDay = allDates[0].date();

        // Count all possible payment dates within the date range
        let currentDate = dateFrom.date(paymentDay);
        if (currentDate.isBefore(dateFrom)) {
          currentDate = currentDate.add(1, 'month');
        }

        while (currentDate.isSameOrBefore(dateTo)) {
          const isOccurred = currentDate.isSameOrBefore(today);

          // Check if this date should be counted as an occurrence
          if (currentDate.isSameOrBefore(dateTo)) {
            if (isOccurred) {
              if (!allDates.some(d => d.isSame(currentDate, 'day'))) {
                group.occurredCount++;
                group.occurredAmount += group.transactions[0].amount;
              }
            } else {
              if (!allDates.some(d => d.isSame(currentDate, 'day'))) {
                group.pendingCount++;
                group.pendingAmount += group.transactions[0].amount;
              }
            }
          }

          currentDate = currentDate.add(1, 'month');
        }
      }
    });

    return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredTransactions, selectedValue, date, today]);

  // Update summary calculations to match the same date range logic
  const summary = useMemo(() => {
    if (!date?.from || !date?.to) {
      return {
        totalAmount: 0,
        occurredAmount: 0,
        pendingAmount: 0
      };
    }

    const dateFrom = dayjs(date.from).startOf('day');
    const dateTo = dayjs(date.to).endOf('day');

    if (selectedValue.startsWith('category_')) {
      const categoryName = selectedValue.replace('category_', '');
      const categoryBills = bills.filter(b => b.category_name === categoryName);

      let occurred = 0;
      let pending = 0;

      categoryBills.forEach(bill => {
        let currentDate = dateFrom.clone().date(bill.day);

        // If we've passed the bill day this month, start from next month
        if (currentDate.isBefore(dateFrom)) {
          currentDate = currentDate.add(1, 'month');
        }

        // Generate all occurrences within date range
        while (currentDate.isSameOrBefore(dateTo)) {
          if (currentDate.isSameOrBefore(today)) {
            occurred += bill.amount;
          } else {
            pending += bill.amount;
          }
          currentDate = currentDate.add(1, 'month');
        }
      });

      return {
        totalAmount: occurred + pending,
        occurredAmount: occurred,
        pendingAmount: pending
      };
    }

    // Filter transactions to only include those within the date range
    const validTransactions = filteredTransactions.filter(t => {
      const transactionDate = dayjs(t.date);
      return transactionDate.isBetween(dateFrom, dateTo, 'day', '[]');
    });

    return {
      totalAmount: validTransactions.reduce((sum, t) => sum + t.amount, 0),
      occurredAmount: validTransactions
        .filter(t => dayjs(t.date).isSameOrBefore(today, 'day'))
        .reduce((sum, t) => sum + t.amount, 0),
      pendingAmount: validTransactions
        .filter(t => dayjs(t.date).isAfter(today, 'day'))
        .reduce((sum, t) => sum + t.amount, 0)
    };
  }, [filteredTransactions, date, today, selectedValue, bills]);

  // Update itemTotals to properly calculate occurrences within date range
  const itemTotals = useMemo(() => {
    if (!date?.from || !date?.to) return [];
    const dateFrom = dayjs(date.from).startOf('day');
    const dateTo = dayjs(date.to).endOf('day');

    if (selectedValue === "all_categories") {
      const totals: Record<string, CategoryTotal> = {};

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
            icon: bill.category_icon || null
          };
        }

        let currentDate = dateFrom.clone().date(bill.day);

        // If we've passed the bill day this month, start from next month
        if (currentDate.isBefore(dateFrom)) {
          currentDate = currentDate.add(1, 'month');
        }

        // Generate all occurrences within date range
        while (currentDate.isSameOrBefore(dateTo)) {
          const entry = totals[bill.category_name];

          if (currentDate.isSameOrBefore(today)) {
            entry.occurred += bill.amount;
            entry.occurredCount++;
          } else {
            entry.pending += bill.amount;
            entry.pendingCount++;
          }

          // Move to next month
          currentDate = currentDate.add(1, 'month');
        }

        // Update total after all occurrences are calculated
        const entry = totals[bill.category_name];
        entry.total = entry.occurred + entry.pending;
      });

      return Object.values(totals).sort((a, b) => b.total - a.total);
    } else if (selectedValue.startsWith('category_')) {
      // Individual category view logic remains unchanged
      const categoryName = selectedValue.replace('category_', '');
      const categoryBills = bills.filter(b => b.category_name === categoryName);

      if (categoryBills.length === 0) return [];

      // Get the category details from the first bill
      const categoryDetails = categoryBills[0];

      let total = 0;
      let occurred = 0;
      let pending = 0;
      let occurredCount = 0;
      let pendingCount = 0;

      categoryBills.forEach(bill => {
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

          // Move to next month
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
        icon: categoryDetails.category_icon || null
      }];
    }

    return [];
  }, [filteredTransactions, selectedValue, date, bills, today]);

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

                {selectedValue !== "all" && selectedValue !== "all_categories" && (
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