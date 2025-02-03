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
  const [name, setName] = useState(bill?.name ?? '');
  const [amount, setAmount] = useState(bill?.amount.toString() ?? '');
  const [day, setDay] = useState(bill?.day.toString() ?? '1');

  const handleConfirm = () => {
    if (!bill) return;
    
    onConfirm({
      id: bill.id,
      name,
      amount: parseFloat(amount),
      day: parseInt(day)
    });
    onOpenChange(false);
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
