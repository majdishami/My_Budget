import { useState } from 'react';
import { ChartComponent } from '@/components/ChartComponent';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import dayjs from 'dayjs';

export default function ChartTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Sample data for testing
  const testData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    incomes: [4500, 4700, 4600, 4800, 4900, 5000],
    expenses: [3500, 3600, 3400, 3800, 3700, 3900]
  };

  const dateRange = {
    from: dayjs().subtract(6, 'month').toDate(),
    to: dayjs().toDate()
  };

  const toggleLoading = () => {
    setIsLoading(prev => !prev);
    setHasError(false);
  };

  const toggleError = () => {
    setHasError(prev => !prev);
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Chart Component Test</h1>
      
      <Card className="p-4">
        <div className="flex gap-4 mb-4">
          <Button onClick={toggleLoading}>
            Toggle Loading State
          </Button>
          <Button onClick={toggleError} variant="destructive">
            Toggle Error State
          </Button>
        </div>
        
        <ChartComponent
          dateRange={dateRange}
          data={hasError ? undefined : testData}
          isLoading={isLoading}
        />
      </Card>
    </div>
  );
}
