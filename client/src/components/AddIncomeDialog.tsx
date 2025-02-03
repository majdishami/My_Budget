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
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState } from "react";
import { Income } from "@/types";
import dayjs from "dayjs";

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
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [occurrenceType, setOccurrenceType] = useState<OccurrenceType>('once');
  const [date, setDate] = useState<Date | undefined>(new Date());

  const handleConfirm = () => {
    if (!date) return;

    onConfirm({
      source,
      amount: parseFloat(amount),
      date: dayjs(date).toISOString(),
      occurrenceType
    });
    
    // Reset form
    setSource('');
    setAmount('');
    setOccurrenceType('once');
    setDate(new Date());
  };

  const minSelectableDate = new Date();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Income</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="source">Source</label>
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Enter income source"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="amount">Amount</label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>
          <div className="grid gap-2">
            <label>Occurrence</label>
            <Select
              value={occurrenceType}
              onValueChange={(value: OccurrenceType) => setOccurrenceType(value)}
            >
              <SelectTrigger>
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
            <label>Start Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < minSelectableDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Add Income</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
