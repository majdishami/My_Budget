import { useEffect, useState, useMemo } from "react";
import dayjs from "dayjs";
import { Income, Bill } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { incomeSchema } from "@/lib/validation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { X, Calendar } from "lucide-react";
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

// Initialize dayjs plugins
dayjs.extend(isSameOrBefore);

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
  const today = useMemo(() => dayjs(), []);
  const currentYear = today.year();
  const defaultYear = selectedYear || currentYear;
  const [year, setSelectedYear] = useState<number>(defaultYear);

  // Get bills data
  const { data: bills = [] } = useQuery<Bill[]>({
    queryKey: ['/api/bills'],
    enabled: isOpen,
  });

  // Define default incomes with Zod validation
  const defaultIncomes = useMemo(() => {
    const majdiSalary = {
      id: "majdi-salary",
      source: "Majdi's Salary",
      amount: 4739,
      date: today.format('YYYY-MM-DD'),
      occurrenceType: "twice-monthly",
      firstDate: 1,
      secondDate: 15
    } as const;

    const rubaSalary = {
      id: "ruba-salary",
      source: "Ruba's Salary",
      amount: 2168,
      date: today.format('YYYY-MM-DD'),
      occurrenceType: "biweekly"
    } as const;

    // Validate using Zod schema
    return [
      incomeSchema.parse(majdiSalary),
      incomeSchema.parse(rubaSalary)
    ];
  }, [today]);

  const [incomes] = useState<Income[]>(defaultIncomes);

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

  // Generate year options
  const yearOptions = useMemo(() => {
    return Array.from(
      { length: 11 },
      (_, i) => currentYear - 5 + i
    ).filter(y => y >= 1900 && y <= 2100);
  }, [currentYear]);

  const generateMonthlyIncomes = () => {
    const monthlyIncomes: Record<string, { occurred: number; pending: number }> = {};

    // Initialize months
    for (let month = 0; month < 12; month++) {
      const monthDate = dayjs().year(year).month(month);
      monthlyIncomes[monthDate.format('MMMM')] = { occurred: 0, pending: 0 };
    }

    // Process incomes
    incomes.forEach(income => {
      if (income.source === "Majdi's Salary" && income.occurrenceType === "twice-monthly") {
        // Process twice-monthly salary
        for (let month = 0; month < 12; month++) {
          const monthDate = dayjs().year(year).month(month);
          const monthKey = monthDate.format('MMMM');

          // First payment
          const firstPayday = monthDate.date(income.firstDate || 1);
          if (firstPayday.isSameOrBefore(today)) {
            monthlyIncomes[monthKey].occurred += income.amount;
          } else {
            monthlyIncomes[monthKey].pending += income.amount;
          }

          // Second payment
          const secondPayday = monthDate.date(income.secondDate || 15);
          if (secondPayday.isSameOrBefore(today)) {
            monthlyIncomes[monthKey].occurred += income.amount;
          } else {
            monthlyIncomes[monthKey].pending += income.amount;
          }
        }
      } else if (income.source === "Ruba's Salary" && income.occurrenceType === "biweekly") {
        // Process bi-weekly salary
        let payDate = dayjs('2025-01-10'); // Start date
        const endDate = dayjs().year(year).endOf('year');

        while (payDate.isSameOrBefore(endDate)) {
          if (payDate.year() === year) {
            const monthKey = payDate.format('MMMM');
            if (payDate.isSameOrBefore(today)) {
              monthlyIncomes[monthKey].occurred += income.amount;
            } else {
              monthlyIncomes[monthKey].pending += income.amount;
            }
          }
          payDate = payDate.add(14, 'days');
        }
      }
    });

    return monthlyIncomes;
  };

  const generateMonthlyExpenses = () => {
    const monthlyExpenses: Record<string, { occurred: number; pending: number }> = {};

    // Initialize months
    for (let month = 0; month < 12; month++) {
      const monthDate = dayjs().year(year).month(month);
      monthlyExpenses[monthDate.format('MMMM')] = { occurred: 0, pending: 0 };
    }

    // Process bills
    bills.forEach(bill => {
      for (let month = 0; month < 12; month++) {
        const billDate = dayjs().year(year).month(month).date(bill.day);
        const monthKey = billDate.format('MMMM');

        if (billDate.isSameOrBefore(today)) {
          monthlyExpenses[monthKey].occurred += bill.amount;
        } else {
          monthlyExpenses[monthKey].pending += bill.amount;
        }
      }
    });

    return monthlyExpenses;
  };

  const monthlyIncomes = useMemo(generateMonthlyIncomes, [year, incomes, today]);
  const monthlyExpenses = useMemo(generateMonthlyExpenses, [year, bills, today]);

  // Calculate totals
  const totals = useMemo(() => {
    const result = {
      income: { occurred: 0, pending: 0 },
      expenses: { occurred: 0, pending: 0 }
    };

    Object.values(monthlyIncomes).forEach(month => {
      result.income.occurred += month.occurred;
      result.income.pending += month.pending;
    });

    Object.values(monthlyExpenses).forEach(month => {
      result.expenses.occurred += month.occurred;
      result.expenses.pending += month.pending;
    });

    return result;
  }, [monthlyIncomes, monthlyExpenses]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl font-bold">
              Annual Financial Report
            </DialogTitle>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-4">
            <Select
              value={year.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Annual Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totals.income.occurred + totals.income.pending)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  <div className="text-green-600">
                    ✓ {formatCurrency(totals.income.occurred)} occurred
                  </div>
                  <div className="text-green-400">
                    ⌛ {formatCurrency(totals.income.pending)} pending
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Annual Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(totals.expenses.occurred + totals.expenses.pending)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  <div className="text-red-600">
                    ✓ {formatCurrency(totals.expenses.occurred)} occurred
                  </div>
                  <div className="text-red-400">
                    ⌛ {formatCurrency(totals.expenses.pending)} pending
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(
                    (totals.income.occurred + totals.income.pending) -
                    (totals.expenses.occurred + totals.expenses.pending)
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  <div className="text-blue-600">
                    ✓ {formatCurrency(totals.income.occurred - totals.expenses.occurred)} occurred
                  </div>
                  <div className="text-blue-400">
                    ⌛ {formatCurrency(totals.income.pending - totals.expenses.pending)} pending
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Breakdown */}
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
                  {Object.entries(monthlyIncomes).map(([month, income]) => {
                    const expense = monthlyExpenses[month];
                    const netOccurred = income.occurred - expense.occurred;
                    const netPending = income.pending - expense.pending;

                    return (
                      <TableRow key={month}>
                        <TableCell>{month}</TableCell>
                        <TableCell className="text-right">
                          <div className="text-green-600">
                            ✓ {formatCurrency(income.occurred)}
                          </div>
                          <div className="text-green-400">
                            ⌛ {formatCurrency(income.pending)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-red-600">
                            ✓ {formatCurrency(expense.occurred)}
                          </div>
                          <div className="text-red-400">
                            ⌛ {formatCurrency(expense.pending)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={netOccurred >= 0 ? "text-blue-600" : "text-red-600"}>
                            ✓ {formatCurrency(netOccurred)}
                          </div>
                          <div className={netPending >= 0 ? "text-blue-400" : "text-red-400"}>
                            ⌛ {formatCurrency(netPending)}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}