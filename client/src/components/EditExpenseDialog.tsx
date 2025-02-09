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
  const [month, setMonth] = useState('1');
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

  useEffect(() => {
    if (bill) {
      const billDate = dayjs(bill.date || `2025-${bill.month || '01'}-${bill.day}`);
      setName(bill.name);
      setAmount(bill.amount.toString());
      setDay(bill.day.toString());
      setMonth((bill.month || billDate.month() + 1).toString());
      setYear(billDate.year().toString());
      setCategoryId(bill.categoryId?.toString() || '');
      setReminderEnabled(bill.reminderEnabled || false);
      setReminderDays(bill.reminderDays || 7);
    }
  }, [bill]);

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
    if (!bill || !validateForm()) return;

    onConfirm({
      ...bill,
      name,
      amount: parseFloat(amount),
      day: parseInt(day),
      month: parseInt(month),
      year: parseInt(year),
      date: dayjs(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).toISOString(),
      categoryId: parseInt(categoryId),
      reminderEnabled,
      reminderDays
    });
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
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">Name</label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors(prev => ({ ...prev, name: undefined }));
                }}
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
              <label htmlFor="amount" className="text-sm font-medium">Amount</label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrors(prev => ({ ...prev, amount: undefined }));
                }}
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
              <label htmlFor="category" className="text-sm font-medium">Category</label>
              <Select
                value={categoryId}
                onValueChange={(value) => {
                  setCategoryId(value);
                  setErrors(prev => ({ ...prev, category: undefined }));
                }}
              >
                <SelectTrigger
                  id="category"
                  aria-invalid={!!errors.category}
                  aria-describedby={errors.category ? "category-error" : undefined}
                >
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
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
              </div>
              <div className="grid gap-2">
                <label htmlFor="day" className="text-sm font-medium">Day</label>
                <Input
                  id="day"
                  type="number"
                  min="1"
                  max="31"
                  value={day}
                  onChange={(e) => {
                    setDay(e.target.value);
                    setErrors(prev => ({ ...prev, day: undefined }));
                  }}
                  aria-invalid={!!errors.day}
                  aria-describedby={errors.day ? "day-error" : undefined}
                />
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
              </div>
            </div>
            {(errors.month || errors.day || errors.year) && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errors.month || errors.day || errors.year}
                </AlertDescription>
              </Alert>
            )}
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
            <Button onClick={handleConfirm}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ReminderDialog
        bill={bill}
        isOpen={showReminderDialog}
        onOpenChange={setShowReminderDialog}
        onSave={handleReminderSave}
      />
    </>
  );
}