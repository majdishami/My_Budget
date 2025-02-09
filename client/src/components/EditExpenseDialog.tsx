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
  const [dateType, setDateType] = useState<'monthly' | 'specific'>('monthly');
  const [specificDate, setSpecificDate] = useState<Date | undefined>(undefined);
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
    date?: string;
    reminderDays?: string;
    category?: string;
  }>({});

  useEffect(() => {
    if (bill) {
      const billDate = dayjs(bill.date);
      setName(bill.name);
      setAmount(bill.amount.toString());
      setDay(bill.day.toString());
      setDateType('monthly'); // Default to monthly
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

    if (dateType === 'monthly') {
      const dayNum = parseInt(day);
      if (!day || isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
        newErrors.day = 'Please enter a valid day between 1 and 31';
      }
    } else {
      if (!specificDate) {
        newErrors.date = 'Please select a specific date';
      }
    }

    if (!categoryId) {
      newErrors.category = 'Please select a category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!bill || !validateForm()) return;

    const updatedBill = {
      ...bill,
      name,
      amount: parseFloat(amount),
      categoryId: parseInt(categoryId),
      reminderEnabled,
      reminderDays
    };

    if (dateType === 'monthly') {
      updatedBill.day = parseInt(day);
      // Keep existing month/year for monthly recurring bills
    } else if (specificDate) {
      // For specific date, update the complete date
      updatedBill.date = dayjs(specificDate).toISOString();
      updatedBill.day = dayjs(specificDate).date();
    }

    onConfirm(updatedBill);
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

            <div className="grid gap-2">
              <label className="text-sm font-medium">Date Options</label>
              <RadioGroup
                value={dateType}
                onValueChange={(value: 'monthly' | 'specific') => setDateType(value)}
                className="grid gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <label htmlFor="monthly" className="text-sm">Same day every month</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specific" id="specific" />
                  <label htmlFor="specific" className="text-sm">Specific date</label>
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
        bill={bill}
        isOpen={showReminderDialog}
        onOpenChange={setShowReminderDialog}
        onSave={handleReminderSave}
      />
    </>
  );
}