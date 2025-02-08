import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportFilter } from '@/components/ReportFilter';
import { ChartComponent } from '@/components/ChartComponent';
import { PDFReport } from '@/components/PDFReport';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Icons
import { FileText, Download, Printer } from 'lucide-react';

// Utils
import { formatCurrency } from '@/lib/reportUtils';

// Initialize dayjs plugins
dayjs.extend(isBetween);

export default function Reports() {
  // Set default date range to current month
  const [dateRange, setDateRange] = useState<{from: Date; to: Date}>({
    from: dayjs().startOf('month').toDate(),
    to: dayjs().endOf('month').toDate()
  });

  const [totals, setTotals] = useState({
    income: 0,
    expenses: 0,
    balance: 0
  });

  const { toast } = useToast();

  // Calculate totals when date range changes
  useEffect(() => {
    const startDate = dayjs(dateRange.from);
    const endDate = dayjs(dateRange.to);
    const today = dayjs(); // Use actual current date

    const calculateTotals = () => {
      let income = 0;
      let expenses = 0;

      // Calculate Majdi's salary (1st and 15th of each month)
      let currentDate = startDate.startOf('month');
      while (currentDate.isSameOrBefore(endDate)) {
        const firstPayday = currentDate.date(1);
        const fifteenthPayday = currentDate.date(15);

        if (firstPayday.isBetween(startDate, endDate, 'day', '[]')) {
          // Only add to income if the date has occurred
          if (firstPayday.isBefore(today) || firstPayday.isSame(today, 'day')) {
            income += 2250; // Half of monthly salary
          }
        }

        if (fifteenthPayday.isBetween(startDate, endDate, 'day', '[]')) {
          // Only add to income if the date has occurred
          if (fifteenthPayday.isBefore(today) || fifteenthPayday.isSame(today, 'day')) {
            income += 2250; // Other half of monthly salary
          }
        }

        currentDate = currentDate.add(1, 'month');
      }

      // Calculate Ruba's bi-weekly salary
      let biweeklyDate = dayjs('2025-01-10'); // Starting date
      while (biweeklyDate.isBefore(startDate)) {
        biweeklyDate = biweeklyDate.add(14, 'day');
      }

      while (biweeklyDate.isSameOrBefore(endDate)) {
        if (biweeklyDate.isBetween(startDate, endDate, 'day', '[]')) {
          // Only add to income if the date has occurred
          if (biweeklyDate.isBefore(today) || biweeklyDate.isSame(today, 'day')) {
            income += 2000;
          }
        }
        biweeklyDate = biweeklyDate.add(14, 'day');
      }

      // Calculate expenses
      // Monthly expenses (rent, utilities, etc.)
      currentDate = startDate.startOf('month');
      while (currentDate.isSameOrBefore(endDate)) {
        if (currentDate.isBefore(today) || currentDate.isSame(today, 'month')) {
          // Only add expenses for months that have occurred
          expenses += 3200;
        }
        currentDate = currentDate.add(1, 'month');
      }

      setTotals({
        income,
        expenses,
        balance: income - expenses
      });
    };

    calculateTotals();
  }, [dateRange]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    try {
      await PDFReport.generate(dateRange);
      toast({
        title: "Success",
        description: "Report downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF report",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 print:p-0">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <div className="flex gap-2">
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="print:hidden">
        <ReportFilter onDateRangeChange={setDateRange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.income)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totals.expenses)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totals.balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="print:shadow-none">
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ChartComponent dateRange={dateRange} />
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details Card */}
      <Card className="print:shadow-none">
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-left p-2">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {/* Add dynamic transaction rows based on date range */}
                <tr>
                  <td className="p-2">{dayjs(dateRange.from).format('YYYY-MM-DD')}</td>
                  <td className="p-2">Monthly Rent</td>
                  <td className="p-2 text-right text-red-600">-$3,750.00</td>
                  <td className="p-2">Expense</td>
                </tr>
                <tr>
                  <td className="p-2">{dayjs(dateRange.from).format('YYYY-MM-DD')}</td>
                  <td className="p-2">Salary</td>
                  <td className="p-2 text-right text-green-600">$4,739.00</td>
                  <td className="p-2">Income</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}