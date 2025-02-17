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

// DynamicIcon component for consistent icon rendering
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
  category: string | undefined;
  color: string | undefined;
  icon: string | null | undefined;
}

const CategoryDisplay = ({ category, color, icon }: CategoryDisplayProps) => (
  <div className="flex items-center gap-2">
    <div
      className="w-3 h-3 rounded-full"
      style={{ backgroundColor: color || '#D3D3D3' }}
    />
    {icon && <DynamicIcon iconName={icon} />}
    <span>{category || 'Uncategorized'}</span>
  </div>
);

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
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10
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

  // Calculate summaries based on selection
  const summaries = useMemo(() => {
    if (!generatedTransactions.length) return [];

    if (selectedValue === 'all') {
      return [{
        total: generatedTransactions.reduce((sum, t) => sum + t.amount, 0),
        occurred: generatedTransactions.filter(t => t.occurred).reduce((sum, t) => sum + t.amount, 0),
        pending: generatedTransactions.filter(t => !t.occurred).reduce((sum, t) => sum + t.amount, 0),
        transactions: generatedTransactions
      }];
    }

    if (selectedValue === 'categories') {
      const categoryTotals: Record<string, CategoryTotal> = {};

      generatedTransactions.forEach(t => {
        if (!categoryTotals[t.category_name]) {
          categoryTotals[t.category_name] = {
            category: t.category_name,
            total: 0,
            occurred: 0,
            pending: 0,
            color: t.category_color,
            icon: t.category_icon,
            transactions: []
          };
        }

        const total = categoryTotals[t.category_name];
        total.total += t.amount;
        if (t.occurred) {
          total.occurred += t.amount;
        } else {
          total.pending += t.amount;
        }
        total.transactions.push(t);
      });

      return Object.values(categoryTotals).sort((a, b) => b.total - a.total);
    }

    if (selectedValue.startsWith('category_')) {
      const categoryName = selectedValue.replace('category_', '');
      const categoryTransactions = generatedTransactions.filter(t => t.category_name === categoryName);

      if (categoryTransactions.length) {
        return [{
          category: categoryName,
          total: categoryTransactions.reduce((sum, t) => sum + t.amount, 0),
          occurred: categoryTransactions.filter(t => t.occurred).reduce((sum, t) => sum + t.amount, 0),
          pending: categoryTransactions.filter(t => !t.occurred).reduce((sum, t) => sum + t.amount, 0),
          color: categoryTransactions[0].category_color,
          icon: categoryTransactions[0].category_icon,
          transactions: categoryTransactions
        }];
      }
    }

    if (selectedValue.startsWith('expense_')) {
      const billId = selectedValue.replace('expense_', '');
      const bill = bills.find(b => b.id === billId);
      const billTransactions = generatedTransactions.filter(t => t.description === bill?.name);

      if (billTransactions.length) {
        return [{
          category: bill?.category_name || '',
          total: billTransactions.reduce((sum, t) => sum + t.amount, 0),
          occurred: billTransactions.filter(t => t.occurred).reduce((sum, t) => sum + t.amount, 0),
          pending: billTransactions.filter(t => !t.occurred).reduce((sum, t) => sum + t.amount, 0),
          color: bill?.category_color || '#000000',
          icon: bill?.category_icon || null,
          transactions: billTransactions
        }];
      }
    }

    return [];
  }, [generatedTransactions, selectedValue, bills]);

  // Selection view
  if (!showReport) {
    return (
      <Dialog 
        open={isOpen} 
        onOpenChange={onOpenChange}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Generate Expense Report
              {date?.from && date?.to && (
                <div className="text-sm font-normal text-muted-foreground mt-1">
                  {dayjs(date.from).format('MMM D, YYYY')} - {dayjs(date.to).format('MMM D, YYYY')}
                </div>
              )}
            </DialogTitle>
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

                  {/* Categories */}
                  {!categoriesLoading && categories.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Individual Categories</SelectLabel>
                      {categories.map((category) => (
                        <SelectItem
                          key={`category_${category.name}`}
                          value={`category_${category.name}`}
                          className="text-blue-600"
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}

                  {/* Individual Expenses */}
                  {!billsLoading && bills.length > 0 && (
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
                  )}
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
              disabled={!date?.from || !date?.to || billsLoading || categoriesLoading}
            >
              {billsLoading || categoriesLoading ? "Loading..." : "Generate Report"}
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
        <DialogHeader className="flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <DialogTitle>
              {selectedValue === 'all' ? 'All Expenses' :
               selectedValue === 'categories' ? 'Expenses by Category' :
               selectedValue.startsWith('category_') ? `Category: ${selectedValue.replace('category_', '')}` :
               selectedValue.startsWith('expense_') ? bills.find(b => b.id === selectedValue.replace('expense_', ''))?.name :
               'Expense Report'}
            </DialogTitle>
            <Button variant="outline" onClick={() => setShowReport(false)}>
              Back to Selection
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {dayjs(date?.from).format('MMM D, YYYY')} - {dayjs(date?.to).format('MMM D, YYYY')}
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {summaries.map((summary, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {summary.category && (
                      <CategoryDisplay
                        category={summary.category}
                        color={summary.color}
                        icon={summary.icon}
                      />
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total</div>
                    <div className="text-2xl font-bold">{formatCurrency(summary.total)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Paid</div>
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.occurred)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                    <div className="text-2xl font-bold text-yellow-600">{formatCurrency(summary.pending)}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.transactions
                        .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
                        .map((transaction, idx) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {selectedValue === 'categories' && (
                                  <CategoryDisplay
                                    category={transaction.category_name}
                                    color={transaction.category_color}
                                    icon={transaction.category_icon}
                                  />
                                )}
                                <span>{transaction.description}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(transaction.amount)}</TableCell>
                            <TableCell>
                              <span className={transaction.occurred ? "text-red-600" : "text-yellow-600"}>
                                {transaction.occurred ? 'Paid' : 'Pending'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}