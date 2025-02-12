import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReminderList } from "@/components/ReminderList";
import { Bill } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ViewRemindersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bills: Bill[];
  onUpdateBill?: (bill: Bill) => void;
}

export function ViewRemindersDialog({
  isOpen,
  onOpenChange,
  bills,
  onUpdateBill,
}: ViewRemindersDialogProps) {
  const handleDisableReminder = async (billId: string | number) => {
    const bill = bills.find(b => b.id === billId);
    if (bill && onUpdateBill) {
      const updatedBill = {
        ...bill,
        reminderEnabled: false
      };
      onUpdateBill(updatedBill);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upcoming Bill Reminders</DialogTitle>
        </DialogHeader>
        <ReminderList 
          bills={bills} 
          onDisableReminder={handleDisableReminder}
        />
      </DialogContent>
    </Dialog>
  );
}