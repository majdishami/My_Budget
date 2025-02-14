import { useState, useEffect } from 'react';
import dayjs from "dayjs";
import MonthlyReportDialog from "@/components/MonthlyReportDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Income, Bill } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useLocation } from "wouter";
import { useData } from "@/hooks/useData";

export default function MonthlyReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [, setLocation] = useLocation();
  const today = dayjs('2025-02-14'); // Current date
  const [monthlyData, setMonthlyData] = useState<{
    incomes: Income[];
    bills: Bill[];
    totals: {
      income: number;
      expenses: number;
      net: number;
    };
  } | null>(null);

  // Get incomes and bills from context
  const { incomes = [], bills = [] } = useData();

  useEffect(() => {
    // Calculate monthly income totals
    let totalIncome = 0;

    // Process Majdi's salary (twice monthly)
    const majdiSalary = incomes.find((income: Income) => income.source === "Majdi's Salary");
    if (majdiSalary) {
      // Add both payments for the month
      totalIncome += majdiSalary.amount * 2;
    }

    // Process Ruba's salary (biweekly)
    const rubaSalary = incomes.find((income: Income) => income.source === "Ruba's Salary");
    if (rubaSalary) {
      // Calculate biweekly payments for Ruba starting from Jan 10, 2025
      const startDate = dayjs('2025-01-10');
      const monthStart = today.startOf('month');
      const monthEnd = today.endOf('month');
      let currentDate = startDate;

      while (currentDate.isBefore(monthEnd) || currentDate.isSame(monthEnd, 'day')) {
        if (currentDate.day() === 5 && // Friday
            (currentDate.isAfter(monthStart) || currentDate.isSame(monthStart, 'day')) &&
            (currentDate.isBefore(monthEnd) || currentDate.isSame(monthEnd, 'day'))) {
          totalIncome += rubaSalary.amount;
        }
        currentDate = currentDate.add(14, 'day'); // Move to next biweekly Friday
      }
    }

    // Calculate monthly bill totals
    const totalExpenses = bills.reduce((sum: number, bill: Bill) => sum + bill.amount, 0);

    // Update monthly data
    setMonthlyData({
      incomes,
      bills,
      totals: {
        income: totalIncome,
        expenses: totalExpenses,
        net: totalIncome - totalExpenses
      }
    });
  }, [incomes, bills, today]);

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setLocation("/");
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Monthly Report - {today.format('MMMM YYYY')}</h1>
      {monthlyData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(monthlyData.totals.income)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(monthlyData.totals.expenses)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Net Monthly Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${monthlyData.totals.net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(monthlyData.totals.net)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <MonthlyReportDialog
        isOpen={isDialogOpen}
        onOpenChange={handleOpenChange}
      />
    </div>
  );
}