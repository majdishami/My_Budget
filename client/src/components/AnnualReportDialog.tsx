import { useEffect, useState } from "react";
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

dayjs.extend(isSameOrBefore);

const FIXED_DATE = "2025-02-13";
const CURRENT_YEAR = 2025;

interface AnnualReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedYear?: number;
}

const defaultIncomes = [
  {
    id: "majdi-salary",
    source: "Majdi's Salary",
    amount: 4739,
    date: FIXED_DATE,
    occurrenceType: "twice-monthly" as const,
    firstDate: 1,
    secondDate: 15
  },
  {
    id: "ruba-salary",
    source: "Ruba's Salary",
    amount: 2168,
    date: FIXED_DATE,
    occurrenceType: "biweekly" as const
  }
];

export default function AnnualReportDialog({
  isOpen,
  onOpenChange,
  selectedYear,
}: AnnualReportDialogProps) {
  const [year, setYear] = useState<number>(selectedYear ?? CURRENT_YEAR);
  const [incomes, setIncomes] = useState<Income[]>(() => {
    try {
      return defaultIncomes.map(income => incomeSchema.parse(income));
    } catch (error) {
      console.error('Error parsing default incomes:', error);
      return [];
    }
  });

  const { data: bills = [] } = useQuery<Bill[]>({
    queryKey: ['/api/bills'],
    enabled: isOpen,
  });

  useEffect(() => {
    if (selectedYear != null) {
      setYear(selectedYear);
    }
  }, [selectedYear]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onOpenChange]);

  const generateMonthlyIncomes = () => {
    const monthlyIncomes: Record<string, { occurred: number; pending: number }> = {};
    try {
      const today = dayjs(FIXED_DATE);
      const startOfYear = today.year(year).startOf('year');

      // Initialize all months
      for (let month = 0; month < 12; month++) {
        const monthDate = startOfYear.add(month, 'month');
        monthlyIncomes[monthDate.format('MMMM')] = { occurred: 0, pending: 0 };
      }

      incomes.forEach(income => {
        switch (income.occurrenceType) {
          case "twice-monthly": {
            for (let month = 0; month < 12; month++) {
              const monthDate = startOfYear.add(month, 'month');
              const monthKey = monthDate.format('MMMM');

              const firstPayday = monthDate.date(income.firstDate || 1);
              if (firstPayday.isSameOrBefore(today)) {
                monthlyIncomes[monthKey].occurred += income.amount;
              } else {
                monthlyIncomes[monthKey].pending += income.amount;
              }

              const secondPayday = monthDate.date(income.secondDate || 15);
              if (secondPayday.isSameOrBefore(today)) {
                monthlyIncomes[monthKey].occurred += income.amount;
              } else {
                monthlyIncomes[monthKey].pending += income.amount;
              }
            }
            break;
          }
          case "biweekly": {
            let payDate = dayjs(FIXED_DATE).year(year).month(0).date(10);
            const endDate = startOfYear.endOf('year');

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
            break;
          }
        }
      });
    } catch (error) {
      console.error('Error generating monthly incomes:', error);
    }

    return monthlyIncomes;
  };

  const generateMonthlyExpenses = () => {
    const monthlyExpenses: Record<string, { occurred: number; pending: number }> = {};
    try {
      const today = dayjs(FIXED_DATE);
      const startOfYear = today.year(year).startOf('year');

      for (let month = 0; month < 12; month++) {
        const monthDate = startOfYear.add(month, 'month');
        monthlyExpenses[monthDate.format('MMMM')] = { occurred: 0, pending: 0 };
      }

      bills.forEach(bill => {
        for (let month = 0; month < 12; month++) {
          const billDate = startOfYear.add(month, 'month').date(bill.day);
          const monthKey = billDate.format('MMMM');

          if (billDate.isSameOrBefore(today)) {
            monthlyExpenses[monthKey].occurred += bill.amount;
          } else {
            monthlyExpenses[monthKey].pending += bill.amount;
          }
        }
      });
    } catch (error) {
      console.error('Error generating monthly expenses:', error);
    }

    return monthlyExpenses;
  };

  const monthlyIncomes = generateMonthlyIncomes();
  const monthlyExpenses = generateMonthlyExpenses();

  const totals = {
    income: { occurred: 0, pending: 0 },
    expenses: { occurred: 0, pending: 0 }
  };

  Object.values(monthlyIncomes).forEach(month => {
    totals.income.occurred += month.occurred;
    totals.income.pending += month.pending;
  });

  Object.values(monthlyExpenses).forEach(month => {
    totals.expenses.occurred += month.occurred;
    totals.expenses.pending += month.pending;
  });

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
              onValueChange={(value) => setYear(parseInt(value, 10))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from(
                  { length: 11 },
                  (_, i) => CURRENT_YEAR - 5 + i
                ).map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
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