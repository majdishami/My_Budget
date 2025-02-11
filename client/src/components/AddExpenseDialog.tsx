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
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  id: number;
  name: string;
  color: string;
}

interface AddExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newBill: Omit<Bill, "id">) => void;
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
  const [month, setMonth] = useState(dayjs().month() + 1 + '');
  const [year, setYear] = useState(dayjs().year().toString());
  const [categoryId, setCategoryId] = useState<string>('');
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState(7);

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Validation state
  const [errors, setErrors] = useState<{
    name?: string;
    amount?: string;
    day?: string;
    month?: string;
    year?: string;
    reminderDays?: string;
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
    setDay('1');
    setMonth(dayjs().month() + 1 + '');
    setYear(dayjs().year().toString());
    setCategoryId('');
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

    const monthNum = parseInt(month);
    if (!month || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      newErrors.month = 'Please enter a valid month between 1 and 12';
    }

    const yearNum = parseInt(year);
    const currentYear = dayjs().year();
    if (!year || isNaN(yearNum) || yearNum < currentYear || yearNum > currentYear + 10) {
      newErrors.year = `Please enter a valid year between ${currentYear} and ${currentYear + 10}`;
    }

    if (!categoryId) {
      newErrors.category = 'Please select a category';
    }

    // Validate the date is valid (e.g., not Feb 31)
    if (!newErrors.day && !newErrors.month && !newErrors.year) {
      const date = dayjs(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (!date.isValid()) {
        newErrors.day = 'Please enter a valid date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!validateForm()) return;

    const newBill: Omit<Bill, "id"> = {
      name,
      amount: parseFloat(amount),
      categoryId: parseInt(categoryId),
      date: dayjs(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).toISOString(),
      reminderEnabled,
      reminderDays
    };

    onConfirm(newBill);
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

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: dayjs().month(i).format('MMMM')
  }));

  const currentYear = dayjs().year();
  const years = Array.from({ length: 11 }, (_, i) => ({
    value: (currentYear + i).toString(),
    label: (currentYear + i).toString()
  }));

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <label htmlFor="month" className="text-sm font-medium">Month</label>
                <Select
                  value={month}
                  onValueChange={(value) => {
                    setMonth(value);
                    setErrors(prev => ({ ...prev, month: undefined }));
                  }}
                >
                  <SelectTrigger
                    id="month"
                    aria-invalid={!!errors.month}
                    aria-describedby={errors.month ? "month-error" : undefined}
                  >
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.month && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription id="month-error">{errors.month}</AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="grid gap-2">
                <label htmlFor="expense-day" className="text-sm font-medium">Day</label>
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
                  placeholder="Enter day"
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
              <div className="grid gap-2">
                <label htmlFor="year" className="text-sm font-medium">Year</label>
                <Select
                  value={year}
                  onValueChange={(value) => {
                    setYear(value);
                    setErrors(prev => ({ ...prev, year: undefined }));
                  }}
                >
                  <SelectTrigger
                    id="year"
                    aria-invalid={!!errors.year}
                    aria-describedby={errors.year ? "year-error" : undefined}
                  >
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.year && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription id="year-error">{errors.year}</AlertDescription>
                  </Alert>
                )}
              </div>
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
        isOpen={showReminderDialog}
        onOpenChange={setShowReminderDialog}
        onSave={handleReminderSave}
        defaultEnabled={reminderEnabled}
        defaultDays={reminderDays}
      />
    </>
  );
}