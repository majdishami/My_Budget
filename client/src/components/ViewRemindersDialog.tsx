import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReminderList } from "@/components/ReminderList";
import { Bill } from "@/types";

interface ViewRemindersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bills: Bill[];
}

export function ViewRemindersDialog({
  isOpen,
  onOpenChange,
  bills,
}: ViewRemindersDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upcoming Bill Reminders</DialogTitle>
        </DialogHeader>
        <ReminderList bills={bills} />
      </DialogContent>
    </Dialog>
  );
}
