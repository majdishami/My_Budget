import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface ReportFilterProps {
  onDateRangeChange: (range: DateRange) => void;
  maxDateRange?: number; // Maximum number of days allowed in range
}

export function ReportFilter({ onDateRangeChange, maxDateRange = 90 }: ReportFilterProps) {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date()
  });
  const [error, setError] = useState<string | null>(null);

  // Validate date range whenever it changes
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      const daysDiff = Math.ceil(
        (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff > maxDateRange) {
        setError(`Date range cannot exceed ${maxDateRange} days`);
        return;
      }

      if (dateRange.from > new Date()) {
        setError('Start date cannot be in the future');
        return;
      }

      setError(null);
      onDateRangeChange(dateRange);
    }
  }, [dateRange, maxDateRange, onDateRangeChange]);

  const handleDateSelect = (range: DateRange | undefined) => {
    if (!range) return;

    setDateRange(range);
    if (!range.from || !range.to) {
      toast({
        title: "Invalid Date Range",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }
  };

  return (
    <Card>
      <CardContent className="p-2 md:p-4">
        <div className="space-y-3 md:space-y-4">
          <div className="flex flex-wrap gap-2 md:gap-4 items-center">
            <div className="flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal text-xs md:text-sm',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'LLL dd, y')} -{' '}
                          {format(dateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={handleDateSelect}
                    numberOfMonths={2}
                    disabled={(date) => date > new Date()}
                    defaultMonth={dateRange?.from}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="py-1.5 md:py-2">
              <AlertCircle className="h-3 w-3 md:h-4 md:w-4" />
              <AlertDescription className="text-xs md:text-sm">{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}