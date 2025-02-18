import { useState } from 'react';
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
import { useQuery } from '@tanstack/react-query';

// Initialize dayjs plugins
dayjs.extend(isBetween);

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category_name?: string;
  category_color?: string;
  category_icon?: string;
}

export default function Reports() {
  const today = getCurrentDate();

  // Set default date range to current month
  const [dateRange, setDateRange] = useState<{from: Date; to: Date}>({
    from: today.startOf('month').toDate(),
    to: today.endOf('month').toDate()
  });

  const { toast } = useToast();

  // Fetch transactions for the selected date range
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions', {
      startDate: dayjs(dateRange.from).format('YYYY-MM-DD'),
      endDate: dayjs(dateRange.to).format('YYYY-MM-DD')
    }],
    select: (data) => data.map(t => ({
      ...t,
      isPending: dayjs(t.date).isAfter(today)
    }))
  });

  // Calculate totals
  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'income') {
      acc.income += t.amount;
    } else {
      if (dayjs(t.date).isAfter(today)) {
        acc.pendingExpenses += t.amount;
      } else {
        acc.expenses += t.amount;
      }
    }
    return acc;
  }, { income: 0, expenses: 0, pendingExpenses: 0 });

  const balance = totals.income - (totals.expenses + totals.pendingExpenses);

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
                <div className="flex flex-col">
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(totals.expenses)}
                  </div>
                  {totals.pendingExpenses > 0 && (
                    <div className="text-sm text-yellow-600">
                      + {formatCurrency(totals.pendingExpenses)} pending
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Net Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(balance)}
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
              <ChartComponent dateRange={dateRange} transactions={transactions}/>
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
                    <th className="text-left p-2">Category</th>
                    <th className="text-right p-2">Amount</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions
                    .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
                    .map((transaction, index) => (
                      <tr key={index} className={transaction.isPending ? "bg-yellow-50" : ""}>
                        <td className="p-2">
                          {dayjs(transaction.date).format('YYYY-MM-DD')}
                        </td>
                        <td className="p-2">{transaction.description}</td>
                        <td className="p-2">{transaction.category_name || 'Uncategorized'}</td>
                        <td className={`p-2 text-right ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="p-2 capitalize">{transaction.type}</td>
                        <td className="p-2">
                          {transaction.isPending ? (
                            <span className="text-yellow-600 font-medium">Pending</span>
                          ) : (
                            <span className="text-green-600 font-medium">Completed</span>
                          )}
                        </td>
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