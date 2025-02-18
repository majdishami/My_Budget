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
import { Skeleton } from "@/components/ui/skeleton";

// Icons
import { FileText, Download, Printer, AlertCircle } from 'lucide-react';

// Utils
import { formatCurrency } from '@/lib/reportUtils';
import { getCurrentDate } from '@/lib/utils';

// Initialize dayjs plugins
dayjs.extend(isBetween);

interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

export default function Reports() {
  const today = getCurrentDate();

  // Set default date range to current month
  const [dateRange, setDateRange] = useState<{from: Date; to: Date}>({
    from: today.startOf('month').toDate(),
    to: today.endOf('month').toDate()
  });

  const [totals, setTotals] = useState({
    income: 0,
    expenses: 0,
    balance: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const { toast } = useToast();

  // Calculate totals when date range changes
  useEffect(() => {
    const calculateTotals = () => {
      try {
        setIsLoading(true);
        setError(null);
        let income = 0;
        let expenses = 0;
        const newTransactions: Transaction[] = [];

        // Convert date range to dayjs for calculations
        const startDate = dayjs(dateRange.from);
        const endDate = dayjs(dateRange.to);

        // Helper function to check if a date is in the past or today
        const hasDateOccurred = (checkDate: dayjs.Dayjs) => {
          return checkDate.isBefore(today) || checkDate.isSame(today, 'day');
        };

        // Calculate Majdi's salary for the selected month only
        const currentMonth = startDate.startOf('month');
        if (currentMonth.isBetween(startDate, endDate, 'month', '[]')) {
          // First paycheck of the month
          const firstPayday = currentMonth.date(1);
          if (firstPayday.isBetween(startDate, endDate, 'day', '[]') && hasDateOccurred(firstPayday)) {
            income += 4739;
            newTransactions.push({
              date: firstPayday.format('YYYY-MM-DD'),
              description: "Majdi's Salary",
              amount: 4739,
              type: 'income'
            });
          }

          // Second paycheck of the month
          const fifteenthPayday = currentMonth.date(15);
          if (fifteenthPayday.isBetween(startDate, endDate, 'day', '[]') && hasDateOccurred(fifteenthPayday)) {
            income += 4739;
            newTransactions.push({
              date: fifteenthPayday.format('YYYY-MM-DD'),
              description: "Majdi's Salary",
              amount: 4739,
              type: 'income'
            });
          }
        }

        // Calculate Ruba's bi-weekly salary
        let biweeklyDate = dayjs('2025-01-10'); // Starting date
        while (biweeklyDate.isBefore(startDate)) {
          biweeklyDate = biweeklyDate.add(14, 'day');
        }

        while (biweeklyDate.isSameOrBefore(endDate)) {
          if (biweeklyDate.isBetween(startDate, endDate, 'day', '[]') && hasDateOccurred(biweeklyDate)) {
            income += 2168;
            newTransactions.push({
              date: biweeklyDate.format('YYYY-MM-DD'),
              description: "Ruba's Salary",
              amount: 2168,
              type: 'income'
            });
          }
          biweeklyDate = biweeklyDate.add(14, 'day');
        }

        // Monthly expenses for the selected month
        const monthlyExpenses = [
          { description: 'ATT Phone Bill', amount: 429, date: 1 },
          { description: "Maid's 1st payment", amount: 120, date: 1 },
          { description: 'Monthly Rent', amount: 3750, date: 1 },
          { description: 'Sling TV', amount: 75, date: 3 },
          { description: 'Cox Internet', amount: 81, date: 6 },
          { description: 'Water Bill', amount: 80, date: 7 },
          { description: 'NV Energy Electrical', amount: 250, date: 7 },
          { description: 'TransAmerica Life Insurance', amount: 77, date: 9 },
          { description: 'Credit Card minimum payments', amount: 225, date: 14 },
          { description: 'Apple/Google/YouTube', amount: 130, date: 14 },
          { description: 'Expenses & Groceries', amount: 3000, date: 16 },
          { description: "Maid's 2nd Payment", amount: 120, date: 17 },
          { description: 'SoFi Personal Loan', amount: 1915, date: 17 },
          { description: 'Southwest Gas', amount: 75, date: 17 },
          { description: 'Car Insurance for 3 cars', amount: 704, date: 28 }
        ];

        // Process expenses only for the selected month
        if (currentMonth.isBetween(startDate, endDate, 'month', '[]')) {
          monthlyExpenses.forEach(expense => {
            const expenseDate = currentMonth.date(expense.date);
            if (expenseDate.isBetween(startDate, endDate, 'day', '[]') && hasDateOccurred(expenseDate)) {
              expenses += expense.amount;
              newTransactions.push({
                date: expenseDate.format('YYYY-MM-DD'),
                description: expense.description,
                amount: expense.amount,
                type: 'expense'
              });
            }
          });
        }

        setTotals({
          income,
          expenses,
          balance: income - expenses
        });
        setTransactions(newTransactions);
      } catch (err) {
        console.error('Error calculating totals:', err);
        setError('Failed to calculate financial data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    calculateTotals();
  }, [dateRange, today]);

  const handlePrint = () => {
    try {
      window.print();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to print report",
        variant: "destructive",
      });
    }
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

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 text-red-800 p-4 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

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
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-[150px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-[120px]" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      <Card className="print:shadow-none">
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            {isLoading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ChartComponent dateRange={dateRange} />
            )}
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
            {isLoading ? (
              <Skeleton className="w-full h-[200px]" />
            ) : (
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
                  {transactions
                    .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
                    .map((transaction, index) => (
                      <tr key={index}>
                        <td className="p-2">
                          {dayjs(transaction.date).format('YYYY-MM-DD')}
                        </td>
                        <td className="p-2">{transaction.description}</td>
                        <td className={`p-2 text-right ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="p-2 capitalize">{transaction.type}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}