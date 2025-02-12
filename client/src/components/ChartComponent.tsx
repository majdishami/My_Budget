import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
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

  useEffect(() => {
    if (!chartRef.current || isLoading || !data) return;

    try {
      // Destroy existing chart
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;

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
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [dateRange, data, isLoading]);

  if (error) {
    return (
      <Card className="p-4">
        <div className="text-red-500">Error: {error}</div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
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