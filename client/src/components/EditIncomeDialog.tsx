import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Income } from "@/types";
import dayjs from "dayjs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface EditIncomeDialogProps {
  income: Income | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updatedIncome: Income) => void;
}

export function EditIncomeDialog({
  income,
  isOpen,
  onOpenChange,
  onUpdate,
}: EditIncomeDialogProps) {
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [occurrenceType, setOccurrenceType] = useState<'once' | 'weekly' | 'monthly' | 'biweekly' | 'twice-monthly'>('once');
  const [firstDate, setFirstDate] = useState<number>(1);
  const [secondDate, setSecondDate] = useState<number>(15);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form values when income changes
  useEffect(() => {
    if (income) {
      setSource(income.source);
      setAmount(income.amount.toString());

      if (income.source === "Majdi's Salary") {
        setOccurrenceType('twice-monthly');
        setFirstDate(1);
        setSecondDate(15);
        // For Majdi's salary, we'll show today's date since it's fixed on 1st and 15th
        setDate(dayjs().format('YYYY-MM-DD'));
      } else if (income.source === "Ruba's Salary") {
        setOccurrenceType('biweekly');
        // For Ruba's salary, find the next bi-weekly Friday
        const today = dayjs();
        const startDate = dayjs('2025-01-10');
        const weeksDiff = today.diff(startDate, 'week');
        const nextBiWeeklyFriday = startDate.add(Math.ceil(weeksDiff / 2) * 2, 'week');
        setDate(nextBiWeeklyFriday.format('YYYY-MM-DD'));
      } else {
        // For other incomes, use their actual date and occurrence type
        setOccurrenceType(income.occurrenceType || 'once');
        setDate(dayjs(income.date).format('YYYY-MM-DD'));
        if (income.firstDate) setFirstDate(income.firstDate);
        if (income.secondDate) setSecondDate(income.secondDate);
      }
    }
  }, [income, isOpen]); // Added isOpen to reset form when dialog opens

  const handleSubmit = async () => {
    if (!income || !validateForm()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const updatedIncome: Income = {
        ...income,
        source,
        amount: parseFloat(amount),
        date: dayjs(date).toISOString(),
        occurrenceType,
      };

      // Only include firstDate and secondDate for twice-monthly incomes
      if (occurrenceType === 'twice-monthly') {
        updatedIncome.firstDate = firstDate;
        updatedIncome.secondDate = secondDate;
      }

      await onUpdate(updatedIncome);
      onOpenChange(false);
      logger.info("Successfully updated income", { income: updatedIncome });
    } catch (error) {
      logger.error("Error updating income:", { error });
      setError('Failed to update income. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    if (!source.trim()) {
      setError('Income source is required');
      return false;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0');
      return false;
    }

    if (!date) {
      setError('Please select a date');
      return false;
    }

    return true;
  };

  const generateDayOptions = () => {
    const days = [];
    for (let i = 1; i <= 31; i++) {
      days.push(
        <SelectItem key={i} value={i.toString()}>
          {i}
        </SelectItem>
      );
    }
    return days;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Income</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setError(null);
              }}
              readOnly={source === "Majdi's Salary" || source === "Ruba's Salary"}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
              }}
            />
          </div>

          {source === "Majdi's Salary" ? (
            <p className="text-sm text-muted-foreground">
              Paid twice monthly on the 1st and 15th of each month
            </p>
          ) : source === "Ruba's Salary" ? (
            <p className="text-sm text-muted-foreground">
              Paid bi-weekly on Fridays starting from January 10, 2025
            </p>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="occurrenceType">Frequency</Label>
                <Select
                  value={occurrenceType}
                  onValueChange={(value) => setOccurrenceType(value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">One time</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                    <SelectItem value="twice-monthly">Twice a month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {occurrenceType === 'twice-monthly' ? (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label>First payment day of the month</Label>
                    <Select
                      value={firstDate.toString()}
                      onValueChange={(value) => setFirstDate(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {generateDayOptions()}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Second payment day of the month</Label>
                    <Select
                      value={secondDate.toString()}
                      onValueChange={(value) => setSecondDate(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {generateDayOptions()}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="date">
                    {occurrenceType === 'once' ? 'Date' : 'Start Date'}
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setError(null);
                    }}
                  />
                </div>
              )}
            </>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}