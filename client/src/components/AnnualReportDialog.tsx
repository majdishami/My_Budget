import { useEffect, useState, useMemo } from "react";
import dayjs from "dayjs";
import { Income } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

// Dynamic icon component
const DynamicIcon = ({ iconName }: { iconName: string | null | undefined }) => {
  if (!iconName) return null;

  // Convert icon name to match Lucide naming convention (e.g., "shopping-cart" to "ShoppingCart")
  const formatIconName = (name: string) => {
    return name.split('-').map(part =>
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ).join('');
  };

  const IconComponent = (LucideIcons as any)[formatIconName(iconName)];
  return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
};

interface AnnualReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedYear?: number;
}

interface AnnualSummary {
  majdiTotal: {
    occurred: number;
    pending: number;
  };
  rubaTotal: {
    occurred: number;
    pending: number;
  };
  totalIncome: {
    occurred: number;
    pending: number;
  };
  expensesByCategory: {
    [key: string]: {
      occurred: number;
      pending: number;
    };
  };
  totalExpenses: {
    occurred: number;
    pending: number;
  };
  monthlyBreakdown: {
    [key: string]: {
      income: {
        occurred: number;
        pending: number;
      };
      expenses: {
        occurred: number;
        pending: number;
      };
      net: {
        occurred: number;
        pending: number;
      };
    };
  };
}

interface Category {
  id: number;
  name: string;
  color: string;
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
  category_icon?: string; // Added category_icon field to Bill interface
}

export default function AnnualReportDialog({
  isOpen,
  onOpenChange,
  selectedYear = dayjs().year(),
}: AnnualReportDialogProps) {
  const [year, setSelectedYear] = useState(selectedYear);
  const currentYear = dayjs().year();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
  const today = useMemo(() => dayjs(), []);

  // Fetch bills with categories included
  const { data: bills = [], isLoading: billsLoading } = useQuery<Bill[]>({
    queryKey: ['/api/bills'],
    enabled: isOpen,
  });

  const defaultIncomes = [
    {
      id: '1',
      source: "Majdi's Salary",
      amount: 9478,
      date: '2025-01-01',
    },
    {
      id: '2',
      source: "Ruba's Salary",
      amount: 2168,
      date: '2025-01-10',
    }
  ];

  const [incomes, setIncomes] = useState(defaultIncomes);

  useEffect(() => {
    if (isOpen) {
      try {
        const storedIncomes = localStorage.getItem("incomes");
        if (storedIncomes) {
          const parsedIncomes = JSON.parse(storedIncomes);
          setIncomes(parsedIncomes.length > 0 ? parsedIncomes : defaultIncomes);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    }
  }, [isOpen]);

  const annualSummary = useMemo((): AnnualSummary => {
    const summary: AnnualSummary = {
      majdiTotal: { occurred: 0, pending: 0 },
      rubaTotal: { occurred: 0, pending: 0 },
      totalIncome: { occurred: 0, pending: 0 },
      expensesByCategory: {},
      totalExpenses: { occurred: 0, pending: 0 },
      monthlyBreakdown: {},
    };

    // Initialize monthly breakdown
    for (let month = 0; month < 12; month++) {
      const monthKey = dayjs().month(month).format('MMMM');
      summary.monthlyBreakdown[monthKey] = {
        income: { occurred: 0, pending: 0 },
        expenses: { occurred: 0, pending: 0 },
        net: { occurred: 0, pending: 0 },
      };
    }

    // Process income for both Majdi and Ruba
    incomes.forEach(income => {
      const incomeAmount = Number(income.amount) || 0;

      if (income.source === "Majdi's Salary") {
        // Bi-monthly payments (1st and 15th)
        const perPaycheck = incomeAmount / 2;
        for (let month = 0; month < 12; month++) {
          const monthKey = dayjs().month(month).format('MMMM');
          const firstPayday = dayjs(`${year}-${month + 1}-01`);
          const fifteenthPayday = dayjs(`${year}-${month + 1}-15`);

          // First paycheck
          if (firstPayday.isBefore(today) || firstPayday.isSame(today, 'day')) {
            summary.majdiTotal.occurred += perPaycheck;
            summary.monthlyBreakdown[monthKey].income.occurred += perPaycheck;
          } else {
            summary.majdiTotal.pending += perPaycheck;
            summary.monthlyBreakdown[monthKey].income.pending += perPaycheck;
          }

          // Second paycheck
          if (fifteenthPayday.isBefore(today) || fifteenthPayday.isSame(today, 'day')) {
            summary.majdiTotal.occurred += perPaycheck;
            summary.monthlyBreakdown[monthKey].income.occurred += perPaycheck;
          } else {
            summary.majdiTotal.pending += perPaycheck;
            summary.monthlyBreakdown[monthKey].income.pending += perPaycheck;
          }
        }
      } else if (income.source === "Ruba's Salary") {
        // Bi-weekly payments starting from Jan 10, 2025
        let paymentDate = dayjs('2025-01-10');
        const yearEnd = dayjs(`${year}-12-31`);

        while (paymentDate.isBefore(yearEnd) || paymentDate.isSame(yearEnd, 'day')) {
          if (paymentDate.year() === year) {
            const monthKey = paymentDate.format('MMMM');

            if (paymentDate.isBefore(today) || paymentDate.isSame(today, 'day')) {
              summary.rubaTotal.occurred += incomeAmount;
              summary.monthlyBreakdown[monthKey].income.occurred += incomeAmount;
            } else {
              summary.rubaTotal.pending += incomeAmount;
              summary.monthlyBreakdown[monthKey].income.pending += incomeAmount;
            }
          }
          paymentDate = paymentDate.add(14, 'days');
        }
      }
    });

    // Calculate total income
    summary.totalIncome.occurred = summary.majdiTotal.occurred + summary.rubaTotal.occurred;
    summary.totalIncome.pending = summary.majdiTotal.pending + summary.rubaTotal.pending;

    // Process expenses by category
    bills.forEach(bill => {
      const billAmount = Number(bill.amount) || 0;
      // Ensure we're using the category_name from the bill object
      const categoryName = bill.category_name || 'Uncategorized';

      // Initialize category if not exists
      if (!summary.expensesByCategory[categoryName]) {
        summary.expensesByCategory[categoryName] = {
          occurred: 0,
          pending: 0
        };
      }

      // Calculate expenses for each month
      for (let month = 0; month < 12; month++) {
        const monthKey = dayjs().month(month).format('MMMM');
        const billDate = dayjs(`${year}-${month + 1}-${bill.day}`);

        if (billDate.isBefore(today) || billDate.isSame(today, 'day')) {
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
    Object.keys(summary.monthlyBreakdown).forEach(month => {
      const monthData = summary.monthlyBreakdown[month];
      monthData.net = {
        occurred: monthData.income.occurred - monthData.expenses.occurred,
        pending: monthData.income.pending - monthData.expenses.pending,
      };
    });

    return summary;
  }, [incomes, bills, year, today]);

  // Calculate total net values including both occurred and pending
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
                <button
                  className="rounded-sm opacity-70 hover:opacity-100"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </DialogClose>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-muted/50">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Total Net Annual Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(annualSummary.totalIncome.occurred + annualSummary.totalIncome.pending)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  <span className="text-green-600">✓ {formatCurrency(annualSummary.totalIncome.occurred)}</span> occurred
                  <br />
                  <span className="text-green-400">⌛ {formatCurrency(annualSummary.totalIncome.pending)}</span> pending
                </div>
                <div className="space-y-1 mt-4 text-sm">
                  <div className="flex justify-between">
                    <span>Majdi's Total:</span>
                    <div className="text-right">
                      <div className="text-green-600">✓ {formatCurrency(annualSummary.majdiTotal.occurred)}</div>
                      <div className="text-green-400">⌛ {formatCurrency(annualSummary.majdiTotal.pending)}</div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span>Ruba's Total:</span>
                    <div className="text-right">
                      <div className="text-green-600">✓ {formatCurrency(annualSummary.rubaTotal.occurred)}</div>
                      <div className="text-green-400">⌛ {formatCurrency(annualSummary.rubaTotal.pending)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Total Annual Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(annualSummary.totalExpenses.occurred + annualSummary.totalExpenses.pending)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  <span className="text-red-600">✓ {formatCurrency(annualSummary.totalExpenses.occurred)}</span> occurred
                  <br />
                  <span className="text-red-400">⌛ {formatCurrency(annualSummary.totalExpenses.pending)}</span> pending
                </div>
                <div className="text-sm text-muted-foreground mt-4">
                  {Object.keys(annualSummary.expensesByCategory).length} Expense Categories
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Net Annual Balance</CardTitle>
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
                <div className="text-sm text-muted-foreground mt-4">
                  {totalNet >= 0 ? 'Surplus' : 'Deficit'} for {year}
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
                  {Object.entries(annualSummary.monthlyBreakdown).map(([month, data]) => {
                    const totalIncome = data.income.occurred + data.income.pending;
                    const totalExpenses = data.expenses.occurred + data.expenses.pending;
                    const netTotal = totalIncome - totalExpenses;

                    return (
                      <TableRow key={month}>
                        <TableCell>{month}</TableCell>
                        <TableCell className="text-right">
                          <div className="text-green-600">✓ {formatCurrency(data.income.occurred)}</div>
                          <div className="text-green-400">⌛ {formatCurrency(data.income.pending)}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-red-600">✓ {formatCurrency(data.expenses.occurred)}</div>
                          <div className="text-red-400">⌛ {formatCurrency(data.expenses.pending)}</div>
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
                    );
                  })}
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
                      const categoryBill = bills.find(b => b.category_name === categoryName);
                      const categoryIcon = categoryBill?.category_icon || categoryBill?.category?.icon || null;

                      return (
                        <TableRow key={categoryName}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: categoryBill?.category_color || '#D3D3D3' }}
                              />
                              {categoryIcon && (
                                <DynamicIcon iconName={categoryIcon} />
                              )}
                              <span>{categoryName}</span>
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