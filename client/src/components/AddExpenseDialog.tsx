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
import { ReminderDialog } from "@/components/ReminderDialog";
import { Bell, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState(7);

  // Validation state
  const [errors, setErrors] = useState<{
    name?: string;
    amount?: string;
    day?: string;
  }>({});

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setName('');
    setAmount('');
    setDay('1');
    setReminderEnabled(false);
    setReminderDays(7);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0';
    }

    const dayNum = parseInt(day);
    if (!day || isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      newErrors.day = 'Please enter a valid day between 1 and 31';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!validateForm()) return;

    onConfirm({
      name,
      amount: parseFloat(amount),
      day: parseInt(day),
      reminderEnabled,
      reminderDays
    });

    resetForm();
  };

  const handleReminderSave = (enabled: boolean, days: number) => {
    if (days < 1 || days > 30) {
      setErrors(prev => ({
        ...prev,
        reminderDays: 'Reminder days must be between 1 and 30'
      }));
      return;
    }
    setReminderEnabled(enabled);
    setReminderDays(days);
    setErrors(prev => ({ ...prev, reminderDays: undefined }));
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
              <label htmlFor="expense-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="expense-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors(prev => ({ ...prev, name: undefined }));
                }}
                placeholder="Enter expense name"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription id="name-error">{errors.name}</AlertDescription>
                </Alert>
              )}
            </div>
            <div className="grid gap-2">
              <label htmlFor="expense-amount" className="text-sm font-medium">
                Amount
              </label>
              <Input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrors(prev => ({ ...prev, amount: undefined }));
                }}
                placeholder="Enter amount"
                aria-invalid={!!errors.amount}
                aria-describedby={errors.amount ? "amount-error" : undefined}
              />
              {errors.amount && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription id="amount-error">{errors.amount}</AlertDescription>
                </Alert>
              )}
            </div>
            <div className="grid gap-2">
              <label htmlFor="expense-day" className="text-sm font-medium">
                Day of Month
              </label>
              <Input
                id="expense-day"
                type="number"
                min="1"
                max="31"
                value={day}
                onChange={(e) => {
                  setDay(e.target.value);
                  setErrors(prev => ({ ...prev, day: undefined }));
                }}
                placeholder="Enter day (1-31)"
                aria-invalid={!!errors.day}
                aria-describedby={errors.day ? "day-error" : undefined}
              />
              {errors.day && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription id="day-error">{errors.day}</AlertDescription>
                </Alert>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setShowReminderDialog(true)}
              className="w-full"
              aria-label={reminderEnabled ? `Edit reminder: ${reminderDays} days before due date` : 'Set payment reminder'}
            >
              <Bell className="mr-2 h-4 w-4" />
              {reminderEnabled 
                ? `Payment reminder: ${reminderDays} days before due date` 
                : 'Set payment reminder'}
            </Button>
            {errors.reminderDays && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.reminderDays}</AlertDescription>
                </Alert>
              )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
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