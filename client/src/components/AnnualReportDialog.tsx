import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { Income, Bill } from "@/types";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
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

interface AnnualReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedYear?: number; // Added optional selectedYear
}

export default function AnnualReportDialog({
  isOpen,
  onOpenChange,
  selectedYear = dayjs().year(), // Default to current year
}: AnnualReportDialogProps) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [year, setSelectedYear] = useState(selectedYear); // Use provided or default year
  const currentYear = dayjs().year();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

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

  // Calculate annual income summary with correct frequency handling
  const annualIncomeSummary = (() => {
    const summary = { majdiTotal: 0, rubaTotal: 0, totalIncome: 0 };

    // Calculate Majdi's income (twice monthly)
    const majdiMonthlyAmount = incomes.find(income => income.source === "Majdi's Salary")?.amount || 0;
    summary.majdiTotal = majdiMonthlyAmount * 24; // 12 months × 2 payments per month

    // Calculate Ruba's income (bi-weekly)
    const rubaSalaryAmount = incomes.find(income => income.source === "Ruba's Salary")?.amount || 0;

    // For Ruba's bi-weekly salary
    const startDate = dayjs('2025-01-10');
    const yearStart = dayjs(year.toString()).startOf('year');
    const yearEnd = dayjs(year.toString()).endOf('year');

    let currentDate = startDate.clone();
    let biweeklyPayments = 0;

    // Count bi-weekly payments within the selected year
    while (currentDate.isBefore(yearEnd) || currentDate.isSame(yearEnd, 'day')) {
      if (currentDate.year() === year && currentDate.day() === 5) { // Friday
        const weeksDiff = currentDate.diff(startDate, 'week');
        if (weeksDiff >= 0 && weeksDiff % 2 === 0) {
          biweeklyPayments++;
        }
      }
      currentDate = currentDate.add(1, 'day');
    }

    summary.rubaTotal = rubaSalaryAmount * biweeklyPayments;
    summary.totalIncome = summary.majdiTotal + summary.rubaTotal;

    return summary;
  })();

  // Calculate annual summary for bills by category
  const annualBillsSummary = bills.reduce((acc: { [key: string]: number }, bill) => {
    const annualAmount = Math.round(bill.amount * 12);
    acc[bill.name] = annualAmount;
    return acc;
  }, {});

  const totalAnnualExpenses = Object.values(annualBillsSummary).reduce((sum, amount) => sum + amount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            Annual Report
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
              <DialogClose asChild>
                <Button variant="ghost" size="sm">Close</Button>
              </DialogClose>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Annual Income Summary */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Annual NET Income Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Majdi's Annual Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(annualIncomeSummary.majdiTotal)}
                </div>
                <div className="text-sm text-muted-foreground">
                  24 payments of {formatCurrency(incomes.find(i => i.source === "Majdi's Salary")?.amount || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Ruba's Annual Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(annualIncomeSummary.rubaTotal)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Bi-weekly payments of {formatCurrency(incomes.find(i => i.source === "Ruba's Salary")?.amount || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Total Annual Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(annualIncomeSummary.totalIncome)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Annual Expenses Summary */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Annual Expenses Summary</h2>
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Expense Category</TableHead>
                      <TableHead className="text-right">Monthly Amount</TableHead>
                      <TableHead className="text-right">Annual Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(annualBillsSummary)
                      .sort(([, a], [, b]) => b - a) // Sort by amount descending
                      .map(([category, amount]) => (
                        <TableRow key={category}>
                          <TableCell>{category}</TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(amount / 12)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    <TableRow className="font-bold">
                      <TableCell>Total Annual Expenses</TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(totalAnnualExpenses / 12)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(totalAnnualExpenses)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Net Annual Summary */}
          <Card className="mt-6">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Net Annual Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Annual Income:</span>
                  <span className="text-green-600">{formatCurrency(annualIncomeSummary.totalIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Annual Expenses:</span>
                  <span className="text-red-600">{formatCurrency(totalAnnualExpenses)}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Net Annual Balance:</span>
                  <span className={annualIncomeSummary.totalIncome - totalAnnualExpenses >= 0 ?
                    "text-green-600" : "text-red-600"}>
                    {formatCurrency(annualIncomeSummary.totalIncome - totalAnnualExpenses)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}