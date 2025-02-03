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
import { Bill } from "@/types";

interface EditExpenseDialogProps {
  bill: Bill | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (updatedBill: Bill) => void;
}

export function EditExpenseDialog({
  bill,
  isOpen,
  onOpenChange,
  onConfirm,
}: EditExpenseDialogProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');

  // Update form values when bill changes
  useEffect(() => {
    if (bill) {
      setName(bill.name);
      setAmount(bill.amount.toString());
      setDay(bill.day.toString());
    }
  }, [bill]);

  const handleConfirm = () => {
    if (!bill) return;

    onConfirm({
      id: bill.id,
      name,
      amount: parseFloat(amount),
      day: parseInt(day)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="name">Name</label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            <label htmlFor="day">Day of Month</label>
            <Input
              id="day"
              type="number"
              min="1"
              max="31"
              value={day}
              onChange={(e) => setDay(e.target.value)}
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