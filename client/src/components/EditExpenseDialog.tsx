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
import { Bell, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { logger } from '@/lib/logger';

interface Category {
  id: number;
  name: string;
  color: string;
  icon?: string | null;
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
  const [day, setDay] = useState('');
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
  });

  const [errors, setErrors] = useState<{
    name?: string;
    amount?: string;
    day?: string;
    category?: string;
    general?: string;
  }>({});

  useEffect(() => {
    if (expense && isOpen) {
      try {
        logger.info('Initializing form with expense:', { expense });
        setName(expense.name || '');
        setAmount(expense.amount?.toString() || '');
        setDay(expense.day?.toString() || '');
        setCategoryId(expense.category_id?.toString() || '');
        setReminderEnabled(!!expense.reminderEnabled);
        setReminderDays(expense.reminderDays || 7);
        setErrors({});
        setIsSubmitting(false);
      } catch (error) {
        logger.error('Error initializing form:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load expense details. Please try again.",
        });
      }
    }
  }, [expense, isOpen, toast]);

  const validateForm = useCallback((): boolean => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Please enter an expense name';
    }

    const amountNum = parseFloat(amount);
    if (!amount) {
      newErrors.amount = 'Please enter an amount';
    } else if (isNaN(amountNum)) {
      newErrors.amount = 'Please enter a valid number';
    } else if (amountNum <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    const dayNum = parseInt(day);
    if (!day) {
      newErrors.day = 'Please enter a day of the month';
    } else if (isNaN(dayNum)) {
      newErrors.day = 'Please enter a valid number';
    } else if (dayNum < 1 || dayNum > 31) {
      newErrors.day = 'Day must be between 1 and 31';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, amount, day]);

  const handleConfirm = async () => {
    if (!expense || !validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      logger.info('Starting expense update with values:', {
        name,
        amount,
        day,
        categoryId,
        reminderEnabled,
        reminderDays
      });

      const selectedCategory = categories.find(cat => cat.id.toString() === categoryId);
      const parsedCategoryId = categoryId ? parseInt(categoryId, 10) : null;

      // Create a clean copy of the original expense
      const updatedBill: Bill = {
        ...expense,
        name: name.trim(),
        amount: parseFloat(amount),
        day: parseInt(day, 10),
        category_id: parsedCategoryId,
        category_name: selectedCategory?.name || 'Uncategorized',
        category_color: selectedCategory?.color || '#D3D3D3',
        category_icon: selectedCategory?.icon || null,
        category: {
          name: selectedCategory?.name || 'Uncategorized',
          color: selectedCategory?.color || '#D3D3D3',
          icon: selectedCategory?.icon || null
        },
        reminderEnabled,
        reminderDays,
        isOneTime: false
      };

      logger.info('Updating bill with:', updatedBill);
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
    setReminderEnabled(enabled);
    setReminderDays(days);
    setShowReminderDialog(false);
    toast({
      title: "Reminder Updated",
      description: enabled 
        ? `Reminder set for ${days} days before due date` 
        : "Reminder disabled",
    });
  };

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

            <div className="grid gap-2">
              <label htmlFor="category" className="text-sm font-medium">Category</label>
              <Select
                value={categoryId}
                onValueChange={(value) => {
                  setCategoryId(value);
                  setErrors(prev => ({ ...prev, category: undefined }));
                }}
                disabled={isSubmitting || isCategoriesLoading}
              >
                <SelectTrigger
                  id="category"
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