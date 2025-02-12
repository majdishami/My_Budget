import { useState } from 'react';
import MonthlyReportDialog from "@/components/MonthlyReportDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Income, Bill } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useLocation } from "wouter";

export default function MonthlyReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [, setLocation] = useLocation();
  const [monthlyData, setMonthlyData] = useState<{
    incomes: Income[];
    bills: Bill[];
    totals: {
      income: number;
      expenses: number;
      net: number;
    };
  } | null>(null);

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setLocation("/");
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Monthly Report - February 2025</h1>
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