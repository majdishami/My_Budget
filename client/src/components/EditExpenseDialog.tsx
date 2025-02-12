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
import { Bell, AlertCircle, Calendar as CalendarIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { generateId } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Category {
  id: number;
  name: string;
  color: string;
}

interface EditExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Bill | null;
  onUpdate: (updatedBill: Bill) => void;
}

export default function EditExpenseDialog({
  isOpen,
  onOpenChange,
  expense,
  onUpdate,
}: EditExpenseDialogProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');
  const [dateType, setDateType] = useState<'monthly' | 'specific'>('monthly');
  const [specificDate, setSpecificDate] = useState<Date | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<string>('');
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState(7);

  // Fetch categories with error handling
  const { data: categories = [], isError: isCategoriesError } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    onError: (error) => {
      console.error('Failed to fetch categories:', error);
    }
  });

  // Enhanced validation state
  const [errors, setErrors] = useState<{
    name?: string;
    amount?: string;
    day?: string;
    date?: string;
    reminderDays?: string;
    category?: string;
  }>({});

  useEffect(() => {
    if (expense) {
      setName(expense.name);
      setAmount(expense.amount.toString());
      setDay(expense.day.toString());
      setDateType(expense.isOneTime ? 'specific' : 'monthly');
      setCategoryId(expense.category_id.toString());
      setReminderEnabled(expense.reminderEnabled || false);
      setReminderDays(expense.reminderDays || 7);
      if (expense.date) {
        setSpecificDate(new Date(expense.date));
      }
    }
  }, [expense]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Name validation
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }

    // Amount validation
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum)) {
      newErrors.amount = 'Please enter a valid amount';
    } else if (amountNum <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (amountNum > 1000000) {
      newErrors.amount = 'Amount must be less than 1,000,000';
    }

    // Date validation
    if (dateType === 'monthly') {
      const dayNum = parseInt(day);
      if (!day || isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
        newErrors.day = 'Please enter a valid day between 1 and 31';
      }
    } else {
      if (!specificDate) {
        newErrors.date = 'Please select a specific date';
      } else if (specificDate < new Date('2024-01-01')) {
        newErrors.date = 'Date cannot be before 2024';
      }
    }

    // Category validation
    if (!categoryId) {
      newErrors.category = 'Please select a category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!expense || !validateForm()) return;

    const selectedCategory = categories.find(cat => cat.id.toString() === categoryId);
    if (!selectedCategory) {
      setErrors(prev => ({ ...prev, category: 'Invalid category selected' }));
      return;
    }

    try {
      const baseUpdates = {
        name: name.trim(),
        amount: parseFloat(amount),
        day: parseInt(day),
        category_id: parseInt(categoryId),
        category_name: selectedCategory.name,
        category_color: selectedCategory.color,
        reminderEnabled,
        reminderDays,
        user_id: expense.user_id,
        created_at: expense.created_at
      };

      if (dateType === 'monthly') {
        onUpdate({
          ...expense,
          ...baseUpdates,
          isOneTime: false,
          date: undefined
        });
      } else if (specificDate) {
        const specificBill: Bill = {
          id: generateId(),
          ...baseUpdates,
          day: dayjs(specificDate).date(),
          date: dayjs(specificDate).toISOString(),
          isOneTime: true
        };
        onUpdate(specificBill);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error updating expense:', error);
      setErrors(prev => ({ 
        ...prev, 
        general: 'Failed to update expense. Please try again.' 
      }));
    }
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
                maxLength={100}
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
                min="0"
                max="1000000"
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

            <div className="grid gap-2">
              <label className="text-sm font-medium">Date Options</label>
              <RadioGroup
                value={dateType}
                onValueChange={(value: 'monthly' | 'specific') => setDateType(value)}
                className="grid gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <label htmlFor="monthly" className="text-sm">Update recurring monthly expense</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specific" id="specific" />
                  <label htmlFor="specific" className="text-sm">Update specific occurrence only</label>
                </div>
              </RadioGroup>

              {dateType === 'monthly' ? (
                <div className="grid gap-2">
                  <label htmlFor="day" className="text-sm font-medium">Day of Month</label>
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
                  {errors.day && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription id="day-error">{errors.day}</AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="grid gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${!specificDate && "text-muted-foreground"}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {specificDate ? dayjs(specificDate).format('MMM D, YYYY') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={specificDate}
                        onSelect={(date) => {
                          setSpecificDate(date);
                          setErrors(prev => ({ ...prev, date: undefined }));
                        }}
                        initialFocus
                        disabled={(date) => date < new Date('2024-01-01')}
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.date && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription id="date-error">{errors.date}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
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
            <Button onClick={handleConfirm}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ReminderDialog
        bill={expense}
        isOpen={showReminderDialog}
        onOpenChange={setShowReminderDialog}
        onSave={handleReminderSave}
      />
    </>
  );
}