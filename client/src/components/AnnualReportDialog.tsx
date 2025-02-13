import { useEffect, useState, useMemo } from "react";
import dayjs from "dayjs";
import { Income } from "@/types";
import { formatCurrency, getCurrentDate } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Calendar, AlertCircle } from "lucide-react";
import * as LucideIcons from "lucide-react";
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

// Initialize dayjs plugins
dayjs.extend(isSameOrBefore);

// Helper function to validate dates
const isValidDate = (date: any): boolean => {
  if (!date) return false;
  const d = dayjs(date);
  return d.isValid() && d.isSame(d); // Additional check for valid date
};

// Safe date parsing helper
const safeParseDate = (date: any, fallback: dayjs.Dayjs): dayjs.Dayjs => {
  const parsed = dayjs(date);
  return isValidDate(parsed) ? parsed : fallback;
};

// Dynamic icon component with error handling
const DynamicIcon = ({ iconName }: { iconName: string | null | undefined }) => {
  try {
    if (!iconName) return null;
    const formatIconName = (name: string) => {
      return name.split('-').map(part =>
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      ).join('');
    };
    const IconComponent = (LucideIcons as any)[formatIconName(iconName)];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  } catch (error) {
    console.error('Error rendering icon:', error);
    return null;
  }
};

interface AnnualSummary {
  majdiTotal: { occurred: number; pending: number; };
  rubaTotal: { occurred: number; pending: number; };
  totalIncome: { occurred: number; pending: number; };
  expensesByCategory: {
    [key: string]: { occurred: number; pending: number; };
  };
  totalExpenses: { occurred: number; pending: number; };
  monthlyBreakdown: {
    [key: string]: {
      income: { occurred: number; pending: number; };
      expenses: { occurred: number; pending: number; };
      net: { occurred: number; pending: number; };
    };
  };
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  day: number;
  category_name: string;
  category_color: string;
  category?: { icon: string | null };
}

interface AnnualReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedYear?: number;
}

export default function AnnualReportDialog({
  isOpen,
  onOpenChange,
  selectedYear,
}: AnnualReportDialogProps) {
  const today = useMemo(() => getCurrentDate(), []);
  const defaultYear = selectedYear || today.year();
  const [year, setSelectedYear] = useState(defaultYear);

  // Generate valid year options
  const yearOptions = useMemo(() => {
    const currentYear = today.year();
    return Array.from(
      { length: 11 },
      (_, i) => currentYear - 5 + i
    ).filter(y => y >= 1900 && y <= 2100);
  }, [today]);

  const { data: bills = [] } = useQuery<Bill[]>({
    queryKey: ['/api/bills'],
    enabled: isOpen,
  });

  // Define default incomes with proper validation
  const defaultIncomes = useMemo(() => ([
    { id: '1', source: "Majdi's Salary", amount: 9478, type: 'twice-monthly' },
    { id: '2', source: "Ruba's Salary", amount: 2168, type: 'biweekly' }
  ]), []);

  const [incomes] = useState(defaultIncomes);

  // Add keyboard event listener for Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onOpenChange]);

  // Calculate annual summary with robust error handling
  const annualSummary = useMemo(() => {
    try {
      const summary = {
        majdiTotal: { occurred: 0, pending: 0 },
        rubaTotal: { occurred: 0, pending: 0 },
        totalIncome: { occurred: 0, pending: 0 },
        expensesByCategory: {} as Record<string, { occurred: number; pending: number }>,
        totalExpenses: { occurred: 0, pending: 0 },
        monthlyBreakdown: {} as Record<string, {
          income: { occurred: number; pending: number };
          expenses: { occurred: number; pending: number };
          net: { occurred: number; pending: number };
        }>,
      };

      // Initialize monthly breakdown
      for (let month = 1; month <= 12; month++) {
        const monthDate = safeParseDate(
          dayjs().year(year).month(month - 1).startOf('month'),
          today.startOf('month')
        );
        const monthKey = monthDate.format('MMMM');

        summary.monthlyBreakdown[monthKey] = {
          income: { occurred: 0, pending: 0 },
          expenses: { occurred: 0, pending: 0 },
          net: { occurred: 0, pending: 0 }
        };
      }

      // Process incomes safely
      incomes.forEach(income => {
        const amount = Number(income.amount) || 0;
        if (income.source === "Majdi's Salary") {
          // Process twice-monthly salary
          for (let month = 1; month <= 12; month++) {
            const monthDate = safeParseDate(
              dayjs().year(year).month(month - 1),
              today
            );
            const monthKey = monthDate.format('MMMM');
            const firstPayday = monthDate.date(1);
            const fifteenthPayday = monthDate.date(15);

            [firstPayday, fifteenthPayday].forEach(payDate => {
              if (isValidDate(payDate) && payDate.isSameOrBefore(today)) {
                summary.majdiTotal.occurred += amount / 2;
                summary.monthlyBreakdown[monthKey].income.occurred += amount / 2;
              } else {
                summary.majdiTotal.pending += amount / 2;
                summary.monthlyBreakdown[monthKey].income.pending += amount / 2;
              }
            });
          }
        } else if (income.source === "Ruba's Salary") {
          // Process bi-weekly salary
          let payDate = safeParseDate('2025-01-10', today.startOf('year'));
          const endDate = safeParseDate(
            dayjs().year(year).endOf('year'),
            today.endOf('year')
          );

          while (payDate.isSameOrBefore(endDate)) {
            if (payDate.year() === year) {
              const monthKey = payDate.format('MMMM');
              if (payDate.isSameOrBefore(today)) {
                summary.rubaTotal.occurred += amount;
                summary.monthlyBreakdown[monthKey].income.occurred += amount;
              } else {
                summary.rubaTotal.pending += amount;
                summary.monthlyBreakdown[monthKey].income.pending += amount;
              }
            }
            payDate = payDate.add(14, 'days');
          }
        }
      });

      // Calculate total income
      summary.totalIncome.occurred = summary.majdiTotal.occurred + summary.rubaTotal.occurred;
      summary.totalIncome.pending = summary.majdiTotal.pending + summary.rubaTotal.pending;

      // Process bills safely
      bills.forEach(bill => {
        try {
          const billAmount = Number(bill.amount) || 0;
          const categoryName = bill.category_name || 'Uncategorized';

          if (!summary.expensesByCategory[categoryName]) {
            summary.expensesByCategory[categoryName] = { occurred: 0, pending: 0 };
          }

          for (let month = 1; month <= 12; month++) {
            const billDate = safeParseDate(
              dayjs().year(year).month(month - 1).date(bill.day || 1),
              today
            );
            const monthKey = billDate.format('MMMM');

            if (billDate.isSameOrBefore(today)) {
              summary.expensesByCategory[categoryName].occurred += billAmount;
              summary.monthlyBreakdown[monthKey].expenses.occurred += billAmount;
            } else {
              summary.expensesByCategory[categoryName].pending += billAmount;
              summary.monthlyBreakdown[monthKey].expenses.pending += billAmount;
            }
          }
        } catch (error) {
          console.error('Error processing bill:', error);
        }
      });

      // Calculate total expenses
      Object.values(summary.expensesByCategory).forEach(({ occurred, pending }) => {
        summary.totalExpenses.occurred += occurred;
        summary.totalExpenses.pending += pending;
      });

      // Calculate monthly net amounts
      Object.entries(summary.monthlyBreakdown).forEach(([month, data]) => {
        data.net = {
          occurred: data.income.occurred - data.expenses.occurred,
          pending: data.income.pending - data.expenses.pending
        };
      });

      return summary;
    } catch (error) {
      console.error('Error calculating annual summary:', error);
      return null;
    }
  }, [incomes, bills, year, today, defaultIncomes]);

  if (!annualSummary) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Error Loading Report
            </DialogTitle>
          </DialogHeader>
          <p className="text-red-600">
            There was an error calculating the annual report. Please try again.
          </p>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  const totalNetOccurred = annualSummary.totalIncome.occurred - annualSummary.totalExpenses.occurred;
  const totalNetPending = annualSummary.totalIncome.pending - annualSummary.totalExpenses.pending;
  const totalNet = totalNetOccurred + totalNetPending;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              Annual Financial Report
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-4">
              <Select
                value={year.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue>{year}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((yearOption) => (
                    <SelectItem key={yearOption} value={yearOption.toString()}>
                      {yearOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-sm font-normal flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span>As of {today.format('MMMM D, YYYY')}</span>
              </div>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">
                  Total Net Annual Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(annualSummary.totalIncome.occurred + annualSummary.totalIncome.pending)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  <div className="text-green-600">
                    ✓ {formatCurrency(annualSummary.totalIncome.occurred)} occurred
                  </div>
                  <div className="text-green-400">
                    ⌛ {formatCurrency(annualSummary.totalIncome.pending)} pending
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">
                  Total Annual Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(annualSummary.totalExpenses.occurred + annualSummary.totalExpenses.pending)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  <div className="text-red-600">
                    ✓ {formatCurrency(annualSummary.totalExpenses.occurred)} occurred
                  </div>
                  <div className="text-red-400">
                    ⌛ {formatCurrency(annualSummary.totalExpenses.pending)} pending
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">
                  Net Annual Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalNet >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(totalNet)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  <div className={totalNetOccurred >= 0 ? 'text-blue-600' : 'text-red-600'}>
                    ✓ {formatCurrency(totalNetOccurred)} occurred
                  </div>
                  <div className={totalNetPending >= 0 ? 'text-blue-400' : 'text-red-400'}>
                    ⌛ {formatCurrency(totalNetPending)} pending
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Monthly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Net Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(annualSummary.monthlyBreakdown).map(([month, data]) => (
                    <TableRow key={month}>
                      <TableCell>{month}</TableCell>
                      <TableCell className="text-right">
                        <div className="text-green-600">
                          ✓ {formatCurrency(data.income.occurred)}
                        </div>
                        <div className="text-green-400">
                          ⌛ {formatCurrency(data.income.pending)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-red-600">
                          ✓ {formatCurrency(data.expenses.occurred)}
                        </div>
                        <div className="text-red-400">
                          ⌛ {formatCurrency(data.expenses.pending)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={data.net.occurred >= 0 ? 'text-blue-600' : 'text-red-600'}>
                          ✓ {formatCurrency(data.net.occurred)}
                        </div>
                        <div className={data.net.pending >= 0 ? 'text-blue-400' : 'text-red-400'}>
                          ⌛ {formatCurrency(data.net.pending)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <span>Expense Categories Breakdown</span>
                <div className="text-sm font-normal text-muted-foreground">
                  ({Object.keys(annualSummary.expensesByCategory).length} categories)
                </div>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Annual breakdown of expenses by category, showing occurred and pending amounts
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Monthly Average</TableHead>
                    <TableHead className="text-right">Annual Amount</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(annualSummary.expensesByCategory)
                    .sort(([, a], [, b]) => (b.occurred + b.pending) - (a.occurred + a.pending))
                    .map(([categoryName, amounts]) => {
                      const total = amounts.occurred + amounts.pending;
                      const monthlyAverage = total / 12;
                      const percentage = ((total / (annualSummary.totalExpenses.occurred + annualSummary.totalExpenses.pending)) * 100).toFixed(1);
                      // Find a bill with this category to get the color and icon
                      const categoryBill = bills.find(b => b.category_name === categoryName);

                      return (
                        <TableRow key={categoryName}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: categoryBill?.category_color || '#D3D3D3' }}
                              />
                              {categoryBill?.category?.icon && (
                                <DynamicIcon iconName={categoryBill?.category?.icon} />
                              )}
                              {categoryName}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(monthlyAverage)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-red-600">✓ {formatCurrency(amounts.occurred)}</div>
                            <div className="text-red-400">⌛ {formatCurrency(amounts.pending)}</div>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {percentage}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  <TableRow className="font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency((annualSummary.totalExpenses.occurred + annualSummary.totalExpenses.pending) / 12)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-red-600">✓ {formatCurrency(annualSummary.totalExpenses.occurred)}</div>
                      <div className="text-red-400">⌛ {formatCurrency(annualSummary.totalExpenses.pending)}</div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}