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

interface AnnualReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedYear: number;
}

export default function AnnualReportDialog({
  isOpen,
  onOpenChange,
  selectedYear,
}: AnnualReportDialogProps) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Load data from localStorage
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

  // Calculate annual summary for incomes
  const annualIncomeSummary = incomes.reduce(
    (acc, income) => {
      const incomeDate = dayjs(income.date);
      if (incomeDate.year() === selectedYear) {
        const amount = Math.round(income.amount);
        if (income.source === "Majdi's Salary") {
          acc.majdiTotal += amount;
        } else if (income.source === "Ruba's Salary") {
          acc.rubaTotal += amount;
        }
        acc.totalIncome += amount;
      }
      return acc;
    },
    { majdiTotal: 0, rubaTotal: 0, totalIncome: 0 }
  );

  // Calculate annual summary for bills by category
  const annualBillsSummary = bills.reduce((acc: { [key: string]: number }, bill) => {
    // Multiply by 12 since bills are monthly
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
            Annual Report for {selectedYear}
            <DialogClose asChild>
              <Button variant="ghost" size="sm">Close</Button>
            </DialogClose>
          </DialogTitle>
        </DialogHeader>

        {/* Annual Income Summary */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Annual Income Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Majdi's Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(annualIncomeSummary.majdiTotal)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Ruba's Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(annualIncomeSummary.rubaTotal)}
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
                            {formatCurrency(amount)}
                          </TableCell>
                        </TableRow>
                    ))}
                    <TableRow className="font-bold">
                      <TableCell>Total Annual Expenses</TableCell>
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
                  <span>Total Income:</span>
                  <span className="text-green-600">{formatCurrency(annualIncomeSummary.totalIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Expenses:</span>
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
