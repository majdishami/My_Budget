/**
 * EditExpenseDialog component handles editing an existing expense
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback } from "react";
import { Bill } from "@/types";
import { ReminderDialog } from "@/components/ReminderDialog";
import { Bell, AlertCircle, Calendar as CalendarIcon } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { logger } from '@/lib/logger';

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
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');
  const [dateType, setDateType] = useState<'monthly' | 'specific'>('specific');
  const [specificDate, setSpecificDate] = useState<Date | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<string>('');
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    data: categories = [], 
    isError: isCategoriesError, 
    error: categoriesError,
    isLoading: isCategoriesLoading 
  } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    retry: 3,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const [errors, setErrors] = useState<{
    name?: string;
    amount?: string;
    day?: string;
    date?: string;
    reminderDays?: string;
    category?: string;
    general?: string;
  }>({});

  // Initialize form when expense prop changes
  useEffect(() => {
    if (expense && isOpen) {
      logger.info("Initializing form with expense:", expense);

      // Basic fields
      setName(expense.name || '');
      setAmount(expense.amount?.toString() || '');

      // Date handling
      if (expense.isOneTime) {
        logger.info("Setting up one-time expense date:", expense.date);
        setDateType('specific');
        if (expense.date) {
          setSpecificDate(new Date(expense.date));
        }
      } else {
        logger.info("Setting up monthly expense day:", expense.day);
        setDateType('monthly');
        setDay(expense.day?.toString() || '1');
      }

      // Category
      if (expense.category_id !== null && expense.category_id !== undefined) {
        logger.info("Setting category:", expense.category_id);
        setCategoryId(expense.category_id.toString());
      } else {
        setCategoryId('');
      }

      // Reminders
      setReminderEnabled(Boolean(expense.reminderEnabled));
      setReminderDays(expense.reminderDays || 7);

      // Clear errors
      setErrors({});
      setIsSubmitting(false);
    }
  }, [expense, isOpen]);

  const validateForm = useCallback((): boolean => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Please enter an expense name';
    } else if (name.length > 100) {
      newErrors.name = `Name is too long (${name.length}/100 characters)`;
    }

    const amountNum = parseFloat(amount);
    if (!amount) {
      newErrors.amount = 'Please enter an amount';
    } else if (isNaN(amountNum)) {
      newErrors.amount = 'Please enter a valid number';
    } else if (amountNum <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (amountNum > 1000000) {
      newErrors.amount = 'Amount cannot exceed 1,000,000';
    }

    if (dateType === 'monthly') {
      const dayNum = parseInt(day);
      if (!day) {
        newErrors.day = 'Please enter a day of the month';
      } else if (isNaN(dayNum)) {
        newErrors.day = 'Please enter a valid number';
      } else if (dayNum < 1 || dayNum > 31) {
        newErrors.day = 'Day must be between 1 and 31';
      }
    } else if (!specificDate) {
      newErrors.date = 'Please select a specific date for this expense';
    }

    // Category validation - make it optional
    if (categoryId && !categories?.some((cat: Category) => cat.id.toString() === categoryId)) {
      newErrors.category = 'Selected category is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, amount, dateType, day, specificDate, categoryId, categories]);

  const handleConfirm = async () => {
    if (!expense || !validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    let selectedCategory = categoryId ? categories?.find((cat: Category) => cat.id.toString() === categoryId) : null;

    // If no category is selected, use default uncategorized values
    if (!selectedCategory) {
      selectedCategory = {
        id: 0,
        name: 'Uncategorized',
        color: '#D3D3D3'
      };
    }

    try {
      const baseUpdates = {
        ...expense,
        name: name.trim(),
        amount: parseFloat(amount),
        category_id: selectedCategory.id || null,
        category_name: selectedCategory.name,
        category_color: selectedCategory.color,
        reminderEnabled,
        reminderDays,
      };

      let updatedBill: Bill;

      if (dateType === 'monthly') {
        updatedBill = {
          ...baseUpdates,
          isOneTime: false,
          day: parseInt(day),
          date: undefined
        };
      } else if (specificDate) {
        updatedBill = {
          ...baseUpdates,
          isOneTime: true,
          day: dayjs(specificDate).date(),
          date: dayjs(specificDate).toISOString()
        };
      } else {
        throw new Error('Invalid date configuration');
      }

      onUpdate(updatedBill);
      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
      onOpenChange(false);
    } catch (error) {
      logger.error('Error updating expense:', error);
      setErrors(prev => ({
        ...prev,
        general: error instanceof Error ? error.message : 'Failed to update expense. Please try again.'
      }));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update expense. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
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
    toast({
      title: "Reminder Updated",
      description: enabled 
        ? `Reminder set for ${days} days before due date` 
        : "Reminder disabled",
    });
  };

  // Show error toast for category loading failure
  useEffect(() => {
    if (isCategoriesError && categoriesError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load categories. Please try again.",
      });
    }
  }, [isCategoriesError, categoriesError, toast]);

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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
              {errors.amount && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription id="amount-error">{errors.amount}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Date Options</label>
              <RadioGroup
                value={dateType}
                onValueChange={(value: 'monthly' | 'specific') => setDateType(value)}
                className="grid gap-2"
                disabled={isSubmitting}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <label htmlFor="monthly" className="text-sm">Monthly recurring expense</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specific" id="specific" />
                  <label htmlFor="specific" className="text-sm">One-time expense</label>
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
                    disabled={isSubmitting}
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
                        disabled={isSubmitting}
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

            <div className="grid gap-2">
              <label htmlFor="category" className="text-sm font-medium">Category</label>
              <Select
                value={categoryId}
                onValueChange={(value) => {
                  setCategoryId(value);
                  setErrors(prev => ({ ...prev, category: undefined }));
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger
                  id="category"
                  aria-invalid={!!errors.category}
                  aria-describedby={errors.category ? "category-error" : undefined}
                >
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category: Category) => (
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
              disabled={isSubmitting}
            >
              <Bell className="mr-2 h-4 w-4" />
              {reminderEnabled ? `Reminder: ${reminderDays} days before` : 'Set Reminder'}
            </Button>

            {errors.general && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
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