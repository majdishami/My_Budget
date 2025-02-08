// External dependencies
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Types and Utils
import { DateRange } from "react-day-picker";
import { Income } from "@/types";
import { formatCurrency } from '@/lib/utils';

// Initialize dayjs plugins
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

interface Transaction {
  date: string;
  description: string;
  amount: number;
  occurred: boolean;
}

interface IncomeReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  incomes: Income[];
}

export default function IncomeReportDialog({ isOpen, onOpenChange, incomes }: IncomeReportDialogProps) {
  const today = dayjs('2025-02-08'); // Set to current date (February 08, 2025)
  const [date, setDate] = useState<DateRange | undefined>({
    from: today.toDate(),
    to: undefined
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showReport, setShowReport] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setDate({
        from: today.toDate(),
        to: undefined
      });
      setShowReport(false);
      setTransactions([]);
    }
  }, [isOpen, today]);

  // Generate transactions when date range is selected
  useEffect(() => {
    if (!showReport || !date?.from || !date?.to) return;

    const startDate = dayjs(date.from);
    const endDate = dayjs(date.to);
    const mockTransactions: Transaction[] = [];

    // Helper function to check if a date has occurred
    const hasDateOccurred = (checkDate: dayjs.Dayjs) => {
      return checkDate.isBefore(today) || 
             (checkDate.isSame(today, 'day') && 
              checkDate.isSame(today, 'month') && 
              checkDate.isSame(today, 'year'));
    };

    // Generate transactions based on provided incomes
    incomes.forEach(income => {
      if (income.source === "Majdi's Salary") {
        // Calculate monthly occurrences within the date range
        let currentDate = startDate.startOf('month');

        while (currentDate.isSameOrBefore(endDate)) {
          const firstPayday = currentDate.date(1);
          const fifteenthPayday = currentDate.date(15);

          // Only add transactions that fall within the date range
          if (firstPayday.isBetween(startDate, endDate, 'day', '[]')) {
            mockTransactions.push({
              date: firstPayday.format('YYYY-MM-DD'),
              description: income.source,
              amount: income.amount / 2, // Split monthly amount
              occurred: hasDateOccurred(firstPayday)
            });
          }

          if (fifteenthPayday.isBetween(startDate, endDate, 'day', '[]')) {
            mockTransactions.push({
              date: fifteenthPayday.format('YYYY-MM-DD'),
              description: income.source,
              amount: income.amount / 2, // Split monthly amount
              occurred: hasDateOccurred(fifteenthPayday)
            });
          }

          currentDate = currentDate.add(1, 'month');
        }
      } else if (income.source === "Ruba's Salary") {
        // Find the first bi-weekly payment date that's not before the start date
        let payDate = dayjs('2025-01-10'); // Initial bi-weekly payment date
        while (payDate.isBefore(startDate)) {
          payDate = payDate.add(14, 'day');
        }

        // Add bi-weekly occurrences within range
        while (payDate.isSameOrBefore(endDate)) {
          mockTransactions.push({
            date: payDate.format('YYYY-MM-DD'),
            description: income.source,
            amount: income.amount,
            occurred: hasDateOccurred(payDate)
          });
          payDate = payDate.add(14, 'day');
        }
      }
    });

    // Sort transactions by date
    mockTransactions.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
    setTransactions(mockTransactions);
  }, [showReport, date, incomes, today]);

  if (!showReport) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Select Date Range</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="border rounded-lg p-4 bg-background">
              <Calendar
                mode="range"
                selected={date}
                onSelect={setDate}
                numberOfMonths={1}
                defaultMonth={today.toDate()}
                className="rounded-md"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {date?.from ? (
                <>
                  {dayjs(date.from).format('MMM D, YYYY')}
                  {date.to ? ` - ${dayjs(date.to).format('MMM D, YYYY')}` : ''}
                </>
              ) : (
                'Select start and end dates'
              )}
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <div>
              <Button
                variant="outline"
                onClick={() => {
                  setDate(undefined);
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
            </div>
            <div>
              <Button
                onClick={() => setShowReport(true)}
                disabled={!date?.from || !date?.to}
              >
                Generate Report
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Income Report
            <div className="text-sm font-normal text-muted-foreground mt-1">
              {dayjs(date?.from).format('MMM D, YYYY')} - {dayjs(date?.to).format('MMM D, YYYY')}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Rest of the component remains unchanged */}
      </DialogContent>
    </Dialog>
  );
}