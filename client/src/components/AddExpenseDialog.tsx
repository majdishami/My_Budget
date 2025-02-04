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
import { ReminderDialog } from "@/components/ReminderDialog";
import { Bell } from "lucide-react";

interface AddExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newBill: Omit<Bill, 'id'>) => void;
}

export function AddExpenseDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: AddExpenseDialogProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState(7);

  const handleConfirm = () => {
    onConfirm({
      name,
      amount: parseFloat(amount),
      day: parseInt(day),
      reminderEnabled,
      reminderDays
    });

    // Reset form
    setName('');
    setAmount('');
    setDay('1');
    setReminderEnabled(false);
    setReminderDays(7);
  };

  const handleReminderSave = (enabled: boolean, days: number) => {
    setReminderEnabled(enabled);
    setReminderDays(days);
  };

  const dummyBill: Bill = {
    id: 'temp',
    name,
    amount: parseFloat(amount || '0'),
    day: parseInt(day),
    reminderEnabled,
    reminderDays
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name">Name</label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter expense name"
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
                placeholder="Enter amount"
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
                placeholder="Enter day (1-31)"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowReminderDialog(true)}
              className="w-full"
            >
              <Bell className="mr-2 h-4 w-4" />
              {reminderEnabled ? `Reminder: ${reminderDays} days before` : 'Set Reminder'}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Add Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ReminderDialog
        bill={dummyBill}
        isOpen={showReminderDialog}
        onOpenChange={setShowReminderDialog}
        onSave={handleReminderSave}
      />
    </>
  );
}