import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function MonthlyToDateReport() {
  const [data, setData] = useState<any[]>([]);
  const today = dayjs();
  const startOfMonth = today.startOf('month');
  const daysInReport = today.diff(startOfMonth, 'day') + 1;

  useEffect(() => {
    // Simulated data - replace with actual data fetching
    const dailyData = Array.from({ length: daysInReport }, (_, index) => {
      const date = startOfMonth.add(index, 'day');
      return {
        date: date.format('MMM D'),
        income: 4739 / daysInReport,
        expenses: 3750 / daysInReport,
        running_total: ((4739 - 3750) / daysInReport) * (index + 1)
      };
    });
    setData(dailyData);
  }, [daysInReport]);

  const totals = data.reduce((acc, day) => ({
    income: acc.income + day.income,
    expenses: acc.expenses + day.expenses
  }), { income: 0, expenses: 0 });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Monthly Report (Up to Today)</h1>
      
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
              {formatCurrency(totals.income - totals.expenses)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Running Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ChartContainer
              config={{
                income: { color: "hsl(142.1 76.2% 36.3%)" },
                expenses: { color: "hsl(346.8 77.2% 49.8%)" },
                runningTotal: { color: "hsl(221.2 83.2% 53.3%)" }
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    name="Income" 
                    stroke="var(--color-income)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    name="Expenses" 
                    stroke="var(--color-expenses)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="running_total" 
                    name="Running Total" 
                    stroke="var(--color-runningTotal)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
