import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
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
  const [date, setDate] = useState('');
  const [occurrenceType, setOccurrenceType] = useState<'once' | 'weekly' | 'monthly' | 'biweekly' | 'twice-monthly'>('once');
  const [firstDate, setFirstDate] = useState<number>(1);
  const [secondDate, setSecondDate] = useState<number>(15);

  // Update form values when income changes
  useEffect(() => {
    if (income) {
      setSource(income.source);
      setAmount(income.amount.toString());
      setDate(dayjs(income.date).format('YYYY-MM-DD'));
      setOccurrenceType(income.occurrenceType);
      if (income.firstDate) setFirstDate(income.firstDate);
      if (income.secondDate) setSecondDate(income.secondDate);
    }
  }, [income]);

  // Handle occurrence type change
  const handleOccurrenceTypeChange = (value: 'once' | 'weekly' | 'monthly' | 'biweekly' | 'twice-monthly') => {
    setOccurrenceType(value);
    if (value === 'twice-monthly') {
      const today = dayjs();
      setDate(today.format('YYYY-MM-DD'));
    }
  };

  const handleConfirm = () => {
    if (!income) return;

    const updatedIncome: Income = {
      ...income,
      source,
      amount: parseFloat(amount),
      date: dayjs(date).toISOString(),
      occurrenceType
    };

    if (occurrenceType === 'twice-monthly') {
      updatedIncome.firstDate = firstDate;
      updatedIncome.secondDate = secondDate;
    }

    onUpdate(updatedIncome);
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
              onChange={(e) => setSource(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="occurrenceType">Frequency</Label>
            <Select
              value={occurrenceType}
              onValueChange={handleOccurrenceTypeChange}
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
          {occurrenceType === 'twice-monthly' && (
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
          )}
          {occurrenceType !== 'twice-monthly' && (
            <div className="grid gap-2">
              <Label htmlFor="date">
                {occurrenceType === 'once' ? 'Date' : 'Start Date'}
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}