import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
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
  const [source, setSource] = useState(income?.source ?? '');
  const [amount, setAmount] = useState(income?.amount.toString() ?? '');
  const [date, setDate] = useState(income?.date ? dayjs(income.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));

  const handleConfirm = () => {
    if (!income) return;
    
    onConfirm({
      id: income.id,
      source,
      amount: parseFloat(amount),
      date: dayjs(date).toISOString()
    });
    onOpenChange(false);
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
