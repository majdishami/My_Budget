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
  return d.isValid() && d.year() >= 1900 && d.year() <= 2100;
};

// Dynamic icon component
const DynamicIcon = ({ iconName }: { iconName: string | null | undefined }) => {
  if (!iconName) return null;
  const formatIconName = (name: string) => {
    return name.split('-').map(part =>
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ).join('');
  };
  const IconComponent = (LucideIcons as any)[formatIconName(iconName)];
  return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
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
  selectedYear = getCurrentDate().year(),
}: AnnualReportDialogProps) {
  const [year, setSelectedYear] = useState(selectedYear);
  const today = useMemo(() => getCurrentDate(), []);
  const currentYear = today.year();
  const yearOptions = Array.from(
    { length: 10 }, 
    (_, i) => currentYear - 5 + i
  ).filter(year => year >= 1900 && year <= 2100);

  const { data: bills = [] } = useQuery<Bill[]>({
    queryKey: ['/api/bills'],
    enabled: isOpen,
  });

  const defaultIncomes = useMemo(() => ([
    { id: '1', source: "Majdi's Salary", amount: 9478 },
    { id: '2', source: "Ruba's Salary", amount: 2168 }
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

  const annualSummary = useMemo((): AnnualSummary => {
    const summary: AnnualSummary = {
      majdiTotal: { occurred: 0, pending: 0 },
      rubaTotal: { occurred: 0, pending: 0 },
      totalIncome: { occurred: 0, pending: 0 },
      expensesByCategory: {},
      totalExpenses: { occurred: 0, pending: 0 },
      monthlyBreakdown: {},
    };

    // Initialize monthly breakdown with validation
    for (let month = 1; month <= 12; month++) {
      const monthDate = dayjs().year(year).month(month - 1).startOf('month');
      if (!isValidDate(monthDate)) continue;

      const monthKey = monthDate.format('MMMM');
      summary.monthlyBreakdown[monthKey] = {
        income: { occurred: 0, pending: 0 },
        expenses: { occurred: 0, pending: 0 },
        net: { occurred: 0, pending: 0 }
      };
    }

    // Process Majdi's salary (bi-monthly)
    const majdiAmount = defaultIncomes.find(i => i.source === "Majdi's Salary")?.amount ?? 0;
    const majdiPerPaycheck = majdiAmount / 2;

    for (let month = 1; month <= 12; month++) {
      const monthDate = dayjs().year(year).month(month - 1);
      if (!isValidDate(monthDate)) continue;

      const firstPayday = monthDate.date(1);
      const fifteenthPayday = monthDate.date(15);
      const monthKey = monthDate.format('MMMM');

      if (firstPayday.isValid() && firstPayday.isSameOrBefore(today)) {
        summary.majdiTotal.occurred += majdiPerPaycheck;
        summary.monthlyBreakdown[monthKey].income.occurred += majdiPerPaycheck;
      } else {
        summary.majdiTotal.pending += majdiPerPaycheck;
        summary.monthlyBreakdown[monthKey].income.pending += majdiPerPaycheck;
      }

      if (fifteenthPayday.isValid() && fifteenthPayday.isSameOrBefore(today)) {
        summary.majdiTotal.occurred += majdiPerPaycheck;
        summary.monthlyBreakdown[monthKey].income.occurred += majdiPerPaycheck;
      } else {
        summary.majdiTotal.pending += majdiPerPaycheck;
        summary.monthlyBreakdown[monthKey].income.pending += majdiPerPaycheck;
      }
    }

    // Process Ruba's salary (bi-weekly)
    const rubaAmount = defaultIncomes.find(i => i.source === "Ruba's Salary")?.amount ?? 0;
    let rubaDate = dayjs('2025-01-10');
    if (!isValidDate(rubaDate)) {
      rubaDate = today.startOf('year');
    }
    const endDate = dayjs().year(year).month(11).date(31);

    while (rubaDate.isValid() && rubaDate.isSameOrBefore(endDate)) {
      if (rubaDate.year() === year) {
        const monthKey = rubaDate.format('MMMM');

        if (rubaDate.isSameOrBefore(today)) {
          summary.rubaTotal.occurred += rubaAmount;
          summary.monthlyBreakdown[monthKey].income.occurred += rubaAmount;
        } else {
          summary.rubaTotal.pending += rubaAmount;
          summary.monthlyBreakdown[monthKey].income.pending += rubaAmount;
        }
      }
      rubaDate = rubaDate.add(14, 'days');
    }

    // Calculate total income
    summary.totalIncome.occurred = summary.majdiTotal.occurred + summary.rubaTotal.occurred;
    summary.totalIncome.pending = summary.majdiTotal.pending + summary.rubaTotal.pending;

    // Process bills with validation
    bills.forEach(bill => {
      const billAmount = Number(bill.amount) || 0;
      const categoryName = bill.category_name || 'Uncategorized';

      if (!summary.expensesByCategory[categoryName]) {
        summary.expensesByCategory[categoryName] = { occurred: 0, pending: 0 };
      }

      for (let month = 1; month <= 12; month++) {
        const billDate = dayjs().year(year).month(month - 1).date(bill.day);
        if (!isValidDate(billDate)) continue;

        const monthKey = billDate.format('MMMM');

        if (billDate.isSameOrBefore(today)) {
          summary.expensesByCategory[categoryName].occurred += billAmount;
          summary.monthlyBreakdown[monthKey].expenses.occurred += billAmount;
        } else {
          summary.expensesByCategory[categoryName].pending += billAmount;
          summary.monthlyBreakdown[monthKey].expenses.pending += billAmount;
        }
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
  }, [incomes, bills, year, today, defaultIncomes]);

  // Calculate total net values
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