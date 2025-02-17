import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";
import {  Bill } from "@/types";
import { formatCurrency } from '@/lib/utils';
import { generateTransactions } from '@/lib/transactions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as Icons from 'lucide-react';


interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category_name: string;
  category_color: string;
  category_icon: string | null;
  category_id: number | null;
  occurred: boolean; 
}

interface Category {
  id: number;
  name: string;
  color: string;
  icon?: string | null;
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  day: number;
  category_id: number;
  user_id: number;
  created_at: string;
  isOneTime: boolean;
  category_name: string;
  category_color: string;
  category?: { icon: string | null };
  category_icon?: string | null;
}


interface ExpenseReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Update the DynamicIcon component to properly handle icon names
const DynamicIcon = ({ iconName }: { iconName: string | null | undefined }) => {
  if (!iconName) return null;

  // Convert icon name to match Lucide naming convention (e.g., "shopping-cart" to "ShoppingCart")
  const formatIconName = (name: string) => {
    return name.split('-').map(part =>
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ).join('');
  };

  const IconComponent = (Icons as any)[formatIconName(iconName)];
  return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
};

interface CategoryDisplayProps {
  category: string | undefined;
  color: string | undefined;
  icon: string | null | undefined;
}

// Update the CategoryDisplay component to display consistent icons
function CategoryDisplay({ category, color, icon }: CategoryDisplayProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: color || '#D3D3D3' }}
      />
      {icon && <DynamicIcon iconName={icon} />}
      <span>{category || 'Uncategorized'}</span>
    </div>
  );
}


export default function ExpenseReportDialog({ isOpen, onOpenChange }: ExpenseReportDialogProps) {
  const [selectedValue, setSelectedValue] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>();
  const [showReport, setShowReport] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const today = useMemo(() => dayjs(), []);

  const { data: bills = [], isLoading: billsLoading } = useQuery({
    queryKey: ['/api/bills'],
    cacheTime: 1000 * 60 * 10,
    staleTime: 1000 * 60 * 5
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedValue("all");
      setDate(undefined);
      setShowReport(false);
      setDateError(null);
    }
  }, [isOpen]);

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Ensure dialog can always be closed
        if (!open) {
          setShowReport(false);
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Expense Report</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col space-y-4">
          <div>
            <label className="text-sm font-medium">Select View Option</label>
            <Select value={selectedValue} onValueChange={setSelectedValue}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Views</SelectLabel>
                  <SelectItem value="all">All Expenses</SelectItem>
                  <SelectItem value="categories">By Category</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg p-4">
            <Calendar
              mode="range"
              selected={date}
              onSelect={setDate}
              numberOfMonths={1}
              defaultMonth={today.toDate()}
            />
          </div>

          {dateError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{dateError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!date?.from || !date?.to) {
                setDateError("Please select start and end dates");
                return;
              }
              setShowReport(true);
            }}
            disabled={!date?.from || !date?.to || billsLoading}
          >
            {billsLoading ? "Loading..." : "Generate Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}