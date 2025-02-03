import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportFilter } from '@/components/ReportFilter';
import { ChartComponent } from '@/components/ChartComponent';
import { PDFReport } from '@/components/PDFReport';
import { Button } from '@/components/ui/button';
import { FileText, Download, Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/reportUtils';
import { useToast } from '@/hooks/use-toast';

export default function Reports() {
  const [dateRange, setDateRange] = useState<{from: Date; to: Date}>({
    from: new Date(),
    to: new Date()
  });
  const { toast } = useToast();

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
              {formatCurrency(45000)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(32000)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(13000)}
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
                {/* Sample transactions - replace with actual data */}
                <tr>
                  <td className="p-2">2024-02-01</td>
                  <td className="p-2">Monthly Rent</td>
                  <td className="p-2 text-right text-red-600">-$3,750.00</td>
                  <td className="p-2">Expense</td>
                </tr>
                <tr>
                  <td className="p-2">2024-02-01</td>
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
