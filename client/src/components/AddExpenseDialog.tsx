import { useState, useEffect } from "react";
import { Bill } from "@/types";
import { ReminderDialog } from "@/components/ReminderDialog";
import { Bell, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { generateId } from "@/lib/utils";
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

interface Category {
  id: number;
  name: string;
  color: string;
}

export interface AddExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newBill: Bill) => void;
}

const AddExpenseDialog = ({
  isOpen,
  onOpenChange,
  onConfirm,
}: AddExpenseDialogProps) => {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("1");
  const [categoryId, setCategoryId] = useState<string>("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState(7);
  const [showReminderDialog, setShowReminderDialog] = useState(false);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const [errors, setErrors] = useState<{
    name?: string;
    amount?: string;
    day?: string;
    category?: string;
  }>({});

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setName("");
    setAmount("");
    setDay("1");
    setCategoryId("");
    setReminderEnabled(false);
    setReminderDays(7);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = "Please enter a valid amount greater than 0";
    }

    const dayNum = parseInt(day);
    if (!day || isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      newErrors.day = "Please enter a valid day between 1 and 31";
    }

    if (!categoryId) {
      newErrors.category = "Please select a category";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!validateForm()) return;

    const selectedCategory = categories.find((cat) => cat.id.toString() === categoryId);

    const newBill: Bill = {
      id: generateId(),
      name: name.trim(),
      amount: parseFloat(amount),
      day: parseInt(day),
      category_id: parseInt(categoryId),
      category_name: selectedCategory?.name || "Uncategorized",
      category_color: selectedCategory?.color || "#D3D3D3",
      user_id: 1,
      created_at: new Date().toISOString(),
      isOneTime: false,
      reminderEnabled,
      reminderDays,
    };

    onConfirm(newBill);
    onOpenChange(false);
    resetForm();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }}
              />
              {errors.name && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.name}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid gap-2">
              <label htmlFor="amount" className="text-sm font-medium">
                Amount
              </label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
              />
              {errors.amount && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.amount}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid gap-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <Select
                value={categoryId}
                onValueChange={(value) => {
                  setCategoryId(value);
                  setErrors((prev) => ({ ...prev, category: undefined }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                    >
                      <div className="flex items-center">
                        <div
                          className="w-2 h-2 rounded-full mr-2"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.category}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid gap-2">
              <label htmlFor="day" className="text-sm font-medium">
                Day of Month
              </label>
              <Input
                id="day"
                type="number"
                min={1}
                max={31}
                value={day}
                onChange={(e) => {
                  setDay(e.target.value);
                  setErrors((prev) => ({ ...prev, day: undefined }));
                }}
              />
              {errors.day && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.day}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowReminderDialog(true)}
                className="flex items-center gap-2"
              >
                <Bell className="h-4 w-4" />
                {reminderEnabled
                  ? `Reminder set: ${reminderDays} days before`
                  : "Set reminder"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Add Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showReminderDialog && (
        <ReminderDialog
          isOpen={showReminderDialog}
          onOpenChange={setShowReminderDialog}
          bill={{
            id: generateId(),
            name,
            amount: parseFloat(amount || "0"),
            day: parseInt(day),
            category_id: parseInt(categoryId || "0"),
            category_name: categories.find(cat => cat.id.toString() === categoryId)?.name || "Uncategorized",
            category_color: categories.find(cat => cat.id.toString() === categoryId)?.color || "#D3D3D3",
            user_id: 1,
            created_at: new Date().toISOString(),
            isOneTime: false,
            reminderEnabled,
            reminderDays,
          }}
          onSave={(enabled: boolean, days: number) => {
            setReminderEnabled(enabled);
            setReminderDays(days);
            setShowReminderDialog(false);
          }}
        />
      )}
    </>
  );
};

export default AddExpenseDialog;