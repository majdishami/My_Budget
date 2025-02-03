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

interface EditIncomeDialogProps {
  income: Income | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (updatedIncome: Income) => void;
}

export function EditIncomeDialog({
  income,
  isOpen,
  onOpenChange,
  onConfirm,
}: EditIncomeDialogProps) {
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');

  // Update form values when income changes
  useEffect(() => {
    if (income) {
      setSource(income.source);
      setAmount(income.amount.toString());
      setDate(dayjs(income.date).format('YYYY-MM-DD'));
    }
  }, [income]);

  const handleConfirm = () => {
    if (!income) return;

    onConfirm({
      id: income.id,
      source,
      amount: parseFloat(amount),
      date: dayjs(date).toISOString()
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Income</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="source">Source</label>
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="amount">Amount</label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="date">Effective Date</label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
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