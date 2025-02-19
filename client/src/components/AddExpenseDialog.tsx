import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Bill } from "@/types";
import { ReminderDialog } from "@/components/ReminderDialog";
import { Bell, AlertCircle, Calendar, Tag } from "lucide-react";
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
import { findBestCategoryMatch } from "@/lib/smartTagging";

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
  const [frequency, setFrequency] = useState<'monthly' | 'yearly' | 'one-time'>('monthly');
  const [monthlyDueDate, setMonthlyDueDate] = useState<Date | undefined>(new Date());
  const [oneTimeDate, setOneTimeDate] = useState<Date | undefined>(new Date());
  const [suggestedCategory, setSuggestedCategory] = useState<{
    id: number;
    name: string;
    color: string;
    confidence: number;
  } | null>(null);

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
    setFrequency('monthly');
    setMonthlyDueDate(new Date());
    setOneTimeDate(new Date());
    setSuggestedCategory(null);
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

    if (!categoryId) {
      newErrors.category = 'Please select a category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!validateForm()) return;

    const selectedCategory = categories.find(cat => cat.id.toString() === categoryId);
    const timestamp = Date.now();

    const newBill: Bill = {
      id: `exp_${timestamp}_${Math.random().toString(36).substr(2, 9)}`, // Generate a unique ID
      name: name.trim(),
      amount: parseFloat(amount),
      day: frequency === 'monthly' ? monthlyDueDate?.getDate() : undefined,
      date: frequency === 'one-time' ? oneTimeDate?.toISOString() : undefined,
      yearly_date: frequency === 'yearly' ? monthlyDueDate?.toISOString() : undefined,
      category_id: parseInt(categoryId),
      category_name: selectedCategory?.name || 'Uncategorized',
      category_color: selectedCategory?.color || '#D3D3D3',
      user_id: 1,
      created_at: new Date().toISOString(),
      isOneTime: frequency === 'one-time',
      isYearly: frequency === 'yearly',
      reminderEnabled,
      reminderDays,
    };

    onConfirm(newBill);
    onOpenChange(false);
    resetForm();
  };

  // Smart category suggestion
  useEffect(() => {
    if (name.trim()) {
      const match = findBestCategoryMatch(name, categories);
      if (match && match.confidence > 0.5) {
        setSuggestedCategory({
          id: match.category.id,
          name: match.category.name,
          color: match.category.color,
          confidence: match.confidence
        });
      } else {
        setSuggestedCategory(null);
      }
    } else {
      setSuggestedCategory(null);
    }
  }, [name, categories]);

  // Apply suggested category
  const applySuggestedCategory = () => {
    if (suggestedCategory) {
      setCategoryId(suggestedCategory.id.toString());
      setErrors(prev => ({ ...prev, category: undefined }));
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-[1fr_300px] gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Expense Type Selection */}
              <div className="flex gap-2">
                <Button
                  variant={frequency === 'monthly' ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setFrequency('monthly')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Monthly
                </Button>
                <Button
                  variant={frequency === 'yearly' ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setFrequency('yearly')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Yearly
                </Button>
                <Button
                  variant={frequency === 'one-time' ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setFrequency('one-time')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  One-time
                </Button>
              </div>

              {/* Name Input with Category Suggestion */}
              <div className="grid gap-1">
                <Label htmlFor="expense-name">Name</Label>
                <div className="relative">
                  <Input
                    id="expense-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrors(prev => ({ ...prev, name: undefined }));
                    }}
                    placeholder="Enter expense name"
                    autoComplete="off"
                    className={suggestedCategory ? "pr-24" : ""}
                  />
                  {suggestedCategory && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute right-1 top-1 h-7 px-2 flex items-center gap-1"
                      onClick={applySuggestedCategory}
                    >
                      <Tag className="h-3 w-3" />
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: suggestedCategory.color }}
                      />
                      {suggestedCategory.name}
                    </Button>
                  )}
                </div>
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
                  autoComplete="off"
                />
                {errors.amount && (
                  <Alert variant="destructive" className="py-1">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.amount}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Calendar */}
              <div className="grid gap-1">
                <Label>
                  {frequency === 'monthly' ? "Monthly Due Date" :
                    frequency === 'yearly' ? "Yearly Due Date" :
                      "Expense Date"}
                </Label>
                <div className="border rounded-md">
                  <CalendarComponent
                    mode="single"
                    selected={frequency === 'one-time' ? oneTimeDate : monthlyDueDate}
                    onSelect={frequency === 'one-time' ? setOneTimeDate : setMonthlyDueDate}
                    className="rounded-md [&_.rdp-month]:!w-[280px] [&_.rdp-cell]:!p-0 [&_.rdp-cell]:!w-8 [&_.rdp-cell]:!h-8 [&_.rdp-head_th]:!w-8 [&_.rdp-head_th]:!h-8 [&_.rdp-button]:!p-0 [&_.rdp-nav]:!h-8 [&_.rdp-caption]:!h-8"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {frequency === 'monthly' && monthlyDueDate
                    ? `Repeats monthly on day ${dayjs(monthlyDueDate).date()}`
                    : frequency === 'yearly' && monthlyDueDate
                    ? `Repeats yearly on ${dayjs(monthlyDueDate).format('MMMM D')}`
                    : frequency === 'one-time' && oneTimeDate
                    ? `One-time expense on ${dayjs(oneTimeDate).format('MMMM D, YYYY')}`
                    : ''}
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
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

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-auto pt-4">
                <Button onClick={handleConfirm} className="w-full">Add Expense</Button>
                <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">Cancel</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reminder Dialog */}
      <ReminderDialog
        bill={{
          id: generateId(),
          name,
          amount: parseFloat(amount || '0'),
          day: frequency === 'monthly' ? monthlyDueDate?.getDate() : undefined,
          date: frequency === 'one-time' ? oneTimeDate?.toISOString() : undefined,
          yearly_date: frequency === 'yearly' ? monthlyDueDate?.toISOString() : undefined,
          category_id: parseInt(categoryId || '1'),
          category_name: categories.find(cat => cat.id.toString() === categoryId)?.name || 'Uncategorized',
          category_color: categories.find(cat => cat.id.toString() === categoryId)?.color || '#D3D3D3',
          user_id: 1,
          created_at: new Date().toISOString(),
          isOneTime: frequency === 'one-time',
          isYearly: frequency === 'yearly',
          reminderEnabled,
          reminderDays
        }}
        isOpen={showReminderDialog}
        onOpenChange={setShowReminderDialog}
        onSave={(enabled, days) => {
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
        }}
      />
    </>
  );
}