import { useState, useMemo } from 'react';
import ExpenseReportDialog from "@/components/ExpenseReportDialog";
import { useLocation } from "wouter";
import { Bill } from "@/types";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import dayjs from "dayjs";
import { useData } from "@/contexts/DataContext";
import { Calendar } from "lucide-react";

type ReportType = 'monthly' | 'annual' | 'custom';

export default function ExpenseReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [, setLocation] = useLocation();
  const { bills } = useData();
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('M'));
  const [selectedYear, setSelectedYear] = useState(dayjs().format('YYYY'));
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });

  // Filter bills based on report type and selected dates
  const filteredExpenses = useMemo(() => {
    return bills.filter(bill => {
      const billDate = dayjs(bill.date);

      if (reportType === 'monthly') {
        return billDate.month() + 1 === parseInt(selectedMonth) && 
               billDate.year() === parseInt(selectedYear);
      }

      if (reportType === 'annual') {
        return billDate.year() === parseInt(selectedYear);
      }

      if (reportType === 'custom' && dateRange.from && dateRange.to) {
        return billDate.isAfter(dayjs(dateRange.from).startOf('day')) && 
               billDate.isBefore(dayjs(dateRange.to).endOf('day'));
      }

      return true;
    });
  }, [bills, reportType, selectedMonth, selectedYear, dateRange]);

  const handleOpenChange = (open: boolean) => {
    if (!open && isDialogOpen) {
      setLocation("/");
    }
    setIsDialogOpen(open);
  };

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: dayjs().month(i).format('MMMM')
  })), []);

  const currentYear = dayjs().year();
  const years = useMemo(() => Array.from({ length: 11 }, (_, i) => ({
    value: (currentYear - 5 + i).toString(),
    label: (currentYear - 5 + i).toString()
  })), [currentYear]);

  return (
    <div className="container mx-auto p-4">
      <Card className="p-4 mb-4">
        <h1 className="text-2xl font-bold mb-4">Expense Report</h1>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={reportType} onValueChange={(value: ReportType) => setReportType(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly Report</SelectItem>
                <SelectItem value="annual">Annual Report</SelectItem>
                <SelectItem value="custom">Custom Date Range</SelectItem>
              </SelectContent>
            </Select>

            {reportType === 'monthly' && (
              <>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(month => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {reportType === 'annual' && (
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {reportType === 'custom' && (
            <div className="flex items-center gap-4">
              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
                className="w-full"
              />
              <Button 
                onClick={() => setDateRange({ from: undefined, to: undefined })}
                variant="outline"
              >
                Reset Range
              </Button>
            </div>
          )}
        </div>
      </Card>

      {isDialogOpen && (
        <ExpenseReportDialog
          isOpen={isDialogOpen}
          onOpenChange={handleOpenChange}
          expenses={filteredExpenses}
          dateRange={dateRange}
        />
      )}
    </div>
  );
}