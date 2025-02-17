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
import { Bell, AlertCircle, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { generateId } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import dayjs from "dayjs";

interface Category {
  id: number;
  name: string;
  color: string;
}

interface AddExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newBill: Bill) => void;
}

export function AddExpenseDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: AddExpenseDialogProps) {
  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState(7);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [isMonthly, setIsMonthly] = useState(true);
  const [monthlyDueDate, setMonthlyDueDate] = useState<Date | undefined>(new Date());
  const [oneTimeDate, setOneTimeDate] = useState<Date | undefined>(new Date());

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Validation state
  const [errors, setErrors] = useState<{
    name?: string;
    amount?: string;
    category?: string;
    monthlyDate?: string;
    oneTimeDate?: string;
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
    setCategoryId('');
    setReminderEnabled(false);
    setReminderDays(7);
    setErrors({});
    setIsMonthly(true);
    setMonthlyDueDate(new Date());
    setOneTimeDate(new Date());
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

    if (isMonthly && !monthlyDueDate) {
      newErrors.monthlyDate = 'Please select a monthly due date';
    }

    if (!isMonthly && !oneTimeDate) {
      newErrors.oneTimeDate = 'Please select a date for the one-time expense';
    }

    if (!categoryId) {
      newErrors.category = 'Please select a category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!validateForm()) return;

    const selectedCategory = categories.find(cat => cat.id.toString() === categoryId);

    const newBill: Bill = {
      id: generateId(),
      name: name.trim(),
      amount: parseFloat(amount),
      day: isMonthly ? dayjs(monthlyDueDate).date() : undefined,
      date: !isMonthly ? oneTimeDate?.toISOString() : undefined,
      category_id: parseInt(categoryId),
      category_name: selectedCategory?.name || 'Uncategorized',
      category_color: selectedCategory?.color || '#D3D3D3',
      user_id: 1,
      created_at: new Date().toISOString(),
      isOneTime: !isMonthly,
      reminderEnabled,
      reminderDays,
    };

    onConfirm(newBill);
    onOpenChange(false);
    resetForm();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Expense Type Selection */}
            <div className="grid gap-2">
              <Label className="text-sm font-semibold">Expense Type</Label>
              <div className="flex gap-2">
                <Button 
                  variant={isMonthly ? "default" : "outline"}
                  className={`flex-1 ${isMonthly ? 'bg-primary hover:bg-primary/90' : ''}`}
                  onClick={() => setIsMonthly(true)}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Monthly
                </Button>
                <Button 
                  variant={!isMonthly ? "default" : "outline"}
                  className={`flex-1 ${!isMonthly ? 'bg-primary hover:bg-primary/90' : ''}`}
                  onClick={() => setIsMonthly(false)}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  One-time
                </Button>
              </div>
            </div>

            {/* Name Input */}
            <div className="grid gap-1">
              <Label htmlFor="expense-name">Name</Label>
              <Input
                id="expense-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors(prev => ({ ...prev, name: undefined }));
                }}
                placeholder="Enter expense name"
              />
              {errors.name && (
                <Alert variant="destructive" className="py-1">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.name}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Amount Input */}
            <div className="grid gap-1">
              <Label htmlFor="expense-amount">Amount</Label>
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
              />
              {errors.amount && (
                <Alert variant="destructive" className="py-1">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.amount}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Date Selection */}
            <div className="grid gap-1">
              <Label>{isMonthly ? "Monthly Due Date" : "Expense Date"}</Label>
              <div className="border rounded-md">
                <CalendarComponent
                  mode="single"
                  selected={isMonthly ? monthlyDueDate : oneTimeDate}
                  onSelect={isMonthly ? setMonthlyDueDate : setOneTimeDate}
                  className="rounded-md [&_.rdp-month]:!w-[160px] [&_.rdp-cell]:!w-4 [&_.rdp-cell]:!h-4 [&_.rdp-head_th]:!w-4 [&_.rdp-head_th]:!h-4 [&_.rdp-button]:!p-0 [&_.rdp-nav]:!h-4 [&_.rdp-caption]:!h-4 [&_.rdp-day_selected]:!bg-primary [&_.rdp-day_selected]:!text-primary-foreground [&_.rdp-day_selected]:!font-bold"
                />
              </div>
              {(isMonthly ? errors.monthlyDate : errors.oneTimeDate) && (
                <Alert variant="destructive" className="py-1">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {isMonthly ? errors.monthlyDate : errors.oneTimeDate}
                  </AlertDescription>
                </Alert>
              )}
              {isMonthly && monthlyDueDate && (
                <p className="text-xs text-muted-foreground">
                  Repeats monthly on day {dayjs(monthlyDueDate).date()}
                </p>
              )}
              {!isMonthly && oneTimeDate && (
                <p className="text-xs text-muted-foreground">
                  One-time expense on {dayjs(oneTimeDate).format('MMMM D, YYYY')}
                </p>
              )}
            </div>

            {/* Category Selection */}
            <div className="grid gap-1">
              <Label htmlFor="expense-category">Category</Label>
              <Select
                value={categoryId}
                onValueChange={(value) => {
                  setCategoryId(value);
                  setErrors(prev => ({ ...prev, category: undefined }));
                }}
              >
                <SelectTrigger id="expense-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <Alert variant="destructive" className="py-1">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.category}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Reminder Button */}
            <Button
              variant="outline"
              onClick={() => setShowReminderDialog(true)}
              className="w-full"
            >
              <Bell className="mr-2 h-4 w-4" />
              {reminderEnabled
                ? `Reminder: ${reminderDays} days before due date`
                : 'Set payment reminder'}
            </Button>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleConfirm}>Add Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder Dialog */}
      <ReminderDialog
        bill={{
          id: generateId(),
          name,
          amount: parseFloat(amount || '0'),
          day: isMonthly ? dayjs(monthlyDueDate).date() : undefined,
          date: !isMonthly ? oneTimeDate?.toISOString() : undefined,
          category_id: parseInt(categoryId || '1'),
          category_name: categories.find(cat => cat.id.toString() === categoryId)?.name || 'Uncategorized',
          category_color: categories.find(cat => cat.id.toString() === categoryId)?.color || '#D3D3D3',
          user_id: 1,
          created_at: new Date().toISOString(),
          isOneTime: !isMonthly,
          reminderEnabled,
          reminderDays
        }}
        isOpen={showReminderDialog}
        onOpenChange={setShowReminderDialog}
        onSave={handleReminderSave}
      />
    </>
  );
}

function handleReminderSave(enabled: boolean, days: number) {
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
}