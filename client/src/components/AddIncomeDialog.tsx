import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Income } from "@/types";
import dayjs from "dayjs";
import { Alert, AlertDescription } from "@/components/ui/alert";

type OccurrenceType = 'once' | 'monthly' | 'biweekly' | 'twice-monthly';

interface AddIncomeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newIncome: Omit<Income, 'id'> & { occurrenceType: OccurrenceType }) => void;
}

export function AddIncomeDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: AddIncomeDialogProps) {
  // Form state
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [occurrenceType, setOccurrenceType] = useState<OccurrenceType>('once');
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Validation state
  const [errors, setErrors] = useState<{
    source?: string;
    amount?: string;
    date?: string;
  }>({});

  // Reset form on dialog close
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setSource('');
    setAmount('');
    setOccurrenceType('once');
    setDate(new Date());
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!source.trim()) {
      newErrors.source = 'Income source is required';
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0';
    }

    if (!date) {
      newErrors.date = 'Please select a valid date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!validateForm()) return;

    const parsedAmount = parseFloat(amount);
    if (!date || isNaN(parsedAmount)) return;

    onConfirm({
      source,
      amount: parsedAmount,
      date: dayjs(date).toISOString(),
      occurrenceType
    });

    resetForm();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const minSelectableDate = new Date();

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Income</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="income-source" className="text-sm font-medium">
              Source
            </label>
            <Input
              id="income-source"
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setErrors(prev => ({ ...prev, source: undefined }));
              }}
              placeholder="Enter income source"
              aria-invalid={!!errors.source}
              aria-describedby={errors.source ? "source-error" : undefined}
            />
            {errors.source && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription id="source-error">{errors.source}</AlertDescription>
              </Alert>
            )}
          </div>
          <div className="grid gap-2">
            <label htmlFor="income-amount" className="text-sm font-medium">
              Amount
            </label>
            <Input
              id="income-amount"
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
            <label htmlFor="income-occurrence" className="text-sm font-medium">
              Occurrence
            </label>
            <Select
              value={occurrenceType}
              onValueChange={(value: OccurrenceType) => setOccurrenceType(value)}
            >
              <SelectTrigger id="income-occurrence">
                <SelectValue placeholder="Select occurrence type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Once</SelectItem>
                <SelectItem value="monthly">Once a month</SelectItem>
                <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                <SelectItem value="twice-monthly">Twice a month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Start Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                  aria-invalid={!!errors.date}
                  aria-describedby={errors.date ? "date-error" : undefined}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    setDate(newDate);
                    setErrors(prev => ({ ...prev, date: undefined }));
                  }}
                  disabled={(date) => date < minSelectableDate}
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
          <Button onClick={handleConfirm}>Add Income</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}