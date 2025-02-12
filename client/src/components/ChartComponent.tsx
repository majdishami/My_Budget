import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import dayjs from 'dayjs';

Chart.register(...registerables);

interface ChartComponentProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  data?: {
    incomes: number[];
    expenses: number[];
    labels: string[];
  };
  isLoading?: boolean;
}

export function ChartComponent({ dateRange, data, isLoading = false }: ChartComponentProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cleanup function for chart instance
  const cleanupChart = () => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }
  };

  useEffect(() => {
    // Clean up when component unmounts
    return () => cleanupChart();
  }, []);

  useEffect(() => {
    if (!chartRef.current || isLoading) return;

    // Clean up existing chart
    cleanupChart();

    // If no data is provided, set error state
    if (!data) {
      setError('No data available for the chart');
      return;
    }

    try {
      const ctx = chartRef.current.getContext('2d');
      if (!ctx) {
        setError('Could not initialize chart context');
        return;
      }

      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [
            {
              label: 'Income',
              data: data.incomes,
              borderColor: 'rgb(34, 197, 94)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              fill: true,
            },
            {
              label: 'Expenses',
              data: data.expenses,
              borderColor: 'rgb(239, 68, 68)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) => {
                  return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(value as number);
                },
              },
            },
          },
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  return `${context.dataset.label}: ${new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(context.parsed.y)}`;
                },
              },
            },
          },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating chart');
      cleanupChart();
    }
  }, [dateRange, data, isLoading]);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'No data available for the chart'}
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="min-h-[300px]">
        <canvas ref={chartRef} />
      </div>
    </Card>
  );
}