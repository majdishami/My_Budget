/**
 * ================================================
 * 🔔 ReminderDialog Component
 * ================================================
 * A reusable dialog component for configuring bill payment reminders.
 * Allows users to enable/disable reminders and set the number of
 * days before the due date when they want to be reminded.
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
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { Bill } from "@/types";
import { Label } from "@/components/ui/label";

/**
 * Props for the ReminderDialog component
 * @property bill - The bill to configure reminders for
 * @property isOpen - Controls dialog visibility
 * @property onOpenChange - Callback when dialog open state changes
 * @property onSave - Callback when reminder settings are saved
 */
interface ReminderDialogProps {
  bill: Bill | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (reminderEnabled: boolean, reminderDays: number) => void;
}

export function ReminderDialog({
  bill,
  isOpen,
  onOpenChange,
  onSave,
}: ReminderDialogProps) {
  // 🔄 Local state for reminder settings
  const [enabled, setEnabled] = useState(false);
  const [days, setDays] = useState("7");

  // 📥 Load existing reminder settings when bill changes
  useEffect(() => {
    if (bill) {
      setEnabled(bill.reminderEnabled || false);
      setDays(bill.reminderDays?.toString() || "7");
    }
  }, [bill]);

  // 💾 Handle saving reminder settings
  const handleSave = () => {
    onSave(enabled, parseInt(days));
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reminder Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* 🔔 Reminder Toggle Switch */}
          <div className="flex items-center space-x-2">
            <Switch
              id="reminder-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <Label htmlFor="reminder-enabled">Enable Reminders</Label>
          </div>
          {/* 📅 Days Selection (only shown when enabled) */}
          {enabled && (
            <div className="grid gap-2">
              <Label htmlFor="reminder-days">Days before due date</Label>
              <Input
                id="reminder-days"
                type="number"
                min="1"
                max="30"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}