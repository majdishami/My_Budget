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
import { Switch } from "@/components/ui/switch";
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Validation state
  const [errors, setErrors] = useState<{
    name?: string;
    amount?: string;
    date?: string;
    category?: string;
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
    setSelectedDate(new Date());
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

    if (!selectedDate) {
      newErrors.date = 'Please select a date';
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
      day: isMonthly ? dayjs(selectedDate).date() : undefined,
      date: !isMonthly ? selectedDate?.toISOString() : undefined,
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4 overflow-y-auto py-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="expense-name" className="text-sm font-medium">Name</label>
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
                <label htmlFor="expense-amount" className="text-sm font-medium">Amount</label>
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

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="monthly-toggle" className="text-sm font-medium">
                  {isMonthly ? "Monthly Recurring Expense" : "One-time Expense"}
                </Label>
                <Switch
                  id="monthly-toggle"
                  checked={isMonthly}
                  onCheckedChange={setIsMonthly}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  {isMonthly ? "Select Monthly Due Date" : "Select Date"}
                </label>
                <div className="border rounded-md p-2">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                    initialFocus
                  />
                </div>
                {errors.date && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription id="date-error">{errors.date}</AlertDescription>
                  </Alert>
                )}
                {isMonthly && selectedDate && (
                  <p className="text-sm text-muted-foreground">
                    This expense will be due on day {dayjs(selectedDate).date()} of each month
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <label htmlFor="expense-category" className="text-sm font-medium">Category</label>
                <Select
                  value={categoryId}
                  onValueChange={(value) => {
                    setCategoryId(value);
                    setErrors(prev => ({ ...prev, category: undefined }));
                  }}
                >
                  <SelectTrigger
                    id="expense-category"
                    aria-invalid={!!errors.category}
                    aria-describedby={errors.category ? "category-error" : undefined}
                  >
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
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription id="category-error">{errors.category}</AlertDescription>
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleConfirm}>Add Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ReminderDialog
        bill={{
          id: generateId(),
          name,
          amount: parseFloat(amount || '0'),
          day: selectedDate ? dayjs(selectedDate).date() : 1,
          category_id: parseInt(categoryId || '1'),
          category_name: categories.find(cat => cat.id.toString() === categoryId)?.name || 'Uncategorized',
          category_color: categories.find(cat => cat.id.toString() === categoryId)?.color || '#D3D3D3',
          user_id: 1,
          created_at: new Date().toISOString(),
          isOneTime: !isMonthly,
          date: !isMonthly ? selectedDate?.toISOString() : undefined,
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