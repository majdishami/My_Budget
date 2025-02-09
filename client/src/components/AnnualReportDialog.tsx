import { useEffect, useState, useMemo } from "react";
import dayjs from "dayjs";
import { Income, Bill } from "@/types";
import { formatCurrency } from "@/lib/utils";
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
import { X, Calendar, AlertCircle, Download } from "lucide-react";
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

// Initialize dayjs plugins
dayjs.extend(isSameOrBefore);

interface AnnualReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedYear?: number;
}

interface AnnualSummary {
  majdiTotal: number;
  rubaTotal: number;
  totalIncome: number;
  expensesByCategory: Record<string, number>;
  totalExpenses: number;
  monthlyBreakdown: {
    [key: string]: {
      income: number;
      expenses: number;
      net: number;
    };
  };
}

export default function AnnualReportDialog({
  isOpen,
  onOpenChange,
  selectedYear = dayjs().year(),
}: AnnualReportDialogProps) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [year, setSelectedYear] = useState(selectedYear);
  const currentYear = dayjs().year();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
  const today = useMemo(() => dayjs('2025-02-08'), []); // Fixed date for consistent behavior

  useEffect(() => {
    if (isOpen) {
      const storedIncomes = localStorage.getItem("incomes");
      const storedBills = localStorage.getItem("bills");

      if (storedIncomes) {
        setIncomes(JSON.parse(storedIncomes));
      }
      if (storedBills) {
        setBills(JSON.parse(storedBills));
      }
    }
  }, [isOpen]);

  const annualSummary = useMemo((): AnnualSummary => {
    const summary = {
      majdiTotal: 0,
      rubaTotal: 0,
      totalIncome: 0,
      expensesByCategory: {} as Record<string, number>,
      totalExpenses: 0,
      monthlyBreakdown: {} as Record<string, { income: number; expenses: number; net: number; }>,
    };

    // Calculate Majdi's annual salary
    const majdiMonthlyAmount = incomes.find(income => income.source === "Majdi's Salary")?.amount || 0;
    summary.majdiTotal = majdiMonthlyAmount * 24; // Bi-monthly payments

    // Calculate Ruba's annual salary
    const rubaSalaryAmount = incomes.find(income => income.source === "Ruba's Salary")?.amount || 0;
    const startDate = dayjs('2025-01-10');
    const yearStart = dayjs(year.toString()).startOf('year');
    const yearEnd = dayjs(year.toString()).endOf('year');

    // Initialize monthly breakdown
    for (let month = 0; month < 12; month++) {
      const monthKey = dayjs().month(month).format('MMMM');
      summary.monthlyBreakdown[monthKey] = {
        income: majdiMonthlyAmount * 2, // Majdi's monthly income
        expenses: 0,
        net: 0,
      };
    }

    // Calculate Ruba's bi-weekly payments
    let currentDate = startDate.clone();
    while (currentDate.isBefore(yearEnd) || currentDate.isSame(yearEnd, 'day')) {
      if (currentDate.year() === year && currentDate.day() === 5) {
        const weeksDiff = currentDate.diff(startDate, 'week');
        if (weeksDiff >= 0 && weeksDiff % 2 === 0) {
          const monthKey = currentDate.format('MMMM');
          summary.monthlyBreakdown[monthKey].income += rubaSalaryAmount;
          summary.rubaTotal += rubaSalaryAmount;
        }
      }
      currentDate = currentDate.add(1, 'day');
    }

    // Calculate total income
    summary.totalIncome = summary.majdiTotal + summary.rubaTotal;

    // Calculate expenses by category and monthly breakdown
    bills.forEach(bill => {
      const annualAmount = Math.round(bill.amount * 12);
      summary.expensesByCategory[bill.name] = annualAmount;
      summary.totalExpenses += annualAmount;

      // Add monthly expense to breakdown
      const monthlyAmount = bill.amount;
      Object.keys(summary.monthlyBreakdown).forEach(month => {
        summary.monthlyBreakdown[month].expenses += monthlyAmount;
      });
    });

    // Calculate monthly net amounts
    Object.keys(summary.monthlyBreakdown).forEach(month => {
      summary.monthlyBreakdown[month].net = 
        summary.monthlyBreakdown[month].income - 
        summary.monthlyBreakdown[month].expenses;
    });

    return summary;
  }, [incomes, bills, year]);

  const netAnnualBalance = annualSummary.totalIncome - annualSummary.totalExpenses;
  const monthlyAverageIncome = annualSummary.totalIncome / 12;
  const monthlyAverageExpenses = annualSummary.totalExpenses / 12;

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
          {/* Annual Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-muted/50">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Total Annual Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(annualSummary.totalIncome)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Monthly Average: {formatCurrency(monthlyAverageIncome)}
                </div>
                <div className="space-y-1 mt-4 text-sm">
                  <div className="flex justify-between">
                    <span>Majdi's Contribution:</span>
                    <span className="text-green-600">{formatCurrency(annualSummary.majdiTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ruba's Contribution:</span>
                    <span className="text-green-600">{formatCurrency(annualSummary.rubaTotal)}</span>
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
                  {formatCurrency(annualSummary.totalExpenses)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Monthly Average: {formatCurrency(monthlyAverageExpenses)}
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
                <div className={`text-2xl font-bold ${netAnnualBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(netAnnualBalance)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Monthly Net: {formatCurrency(netAnnualBalance / 12)}
                </div>
                <div className="text-sm text-muted-foreground mt-4">
                  {netAnnualBalance >= 0 ? 'Surplus' : 'Deficit'} for {year}
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
                  {Object.entries(annualSummary.monthlyBreakdown).map(([month, data]) => (
                    <TableRow key={month}>
                      <TableCell>{month}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(data.income)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(data.expenses)}
                      </TableCell>
                      <TableCell className={`text-right ${data.net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {formatCurrency(data.net)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Expense Categories Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Expense Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Monthly Amount</TableHead>
                    <TableHead className="text-right">Annual Amount</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(annualSummary.expensesByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, amount]) => (
                      <TableRow key={category}>
                        <TableCell>{category}</TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(amount / 12)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {((amount / annualSummary.totalExpenses) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}