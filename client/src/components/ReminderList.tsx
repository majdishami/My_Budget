/**
 * ================================================
 * 📋 ReminderList Component
 * ================================================
 * Displays a list of upcoming bill reminders for the next 30 days.
 * Shows reminder dates, due dates, and amounts in a card-based layout.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bill, BillReminder } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

interface ReminderListProps {
  bills: Bill[];
  onDisableReminder?: (billId: string | number) => void;
}

export function ReminderList({ bills, onDisableReminder }: ReminderListProps) {
  // 📅 State for storing calculated reminders
  const [reminders, setReminders] = useState<BillReminder[]>([]);

  /**
   * 🔄 Calculate Upcoming Reminders
   * Processes all bills with enabled reminders and creates
   * reminder entries for the next 30 days
   */
  useEffect(() => {
    // 📊 Set the date range for reminders
    const today = dayjs();
    const thirtyDaysFromNow = today.add(30, 'day');
    const upcomingReminders: BillReminder[] = [];

    // 🔍 Process each bill
    bills.forEach(bill => {
      if (!bill.reminderEnabled) return;

      // 📅 Calculate next occurrence
      let nextDueDate = today.date(bill.day);
      if (nextDueDate.isBefore(today)) {
        nextDueDate = nextDueDate.add(1, 'month');
      }

      // ⏰ Calculate reminder date based on preferences
      const reminderDate = nextDueDate.subtract(bill.reminderDays || 7, 'day');

      // 📥 Add to list if within 30 days
      if (reminderDate.isBefore(thirtyDaysFromNow)) {
        upcomingReminders.push({
          billId: bill.id,
          billName: bill.name,
          dueDate: nextDueDate.format('YYYY-MM-DD'),
          amount: bill.amount,
          reminderDate: reminderDate.format('YYYY-MM-DD')
        });
      }
    });

    // 📊 Sort reminders by date
    upcomingReminders.sort((a, b) => 
      dayjs(a.reminderDate).diff(dayjs(b.reminderDate))
    );

    setReminders(upcomingReminders);
  }, [bills]);

  // 🈚 Show empty state if no reminders
  if (reminders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Upcoming Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You have no bill reminders set for the next 30 days.
          </p>
        </CardContent>
      </Card>
    );
  }

  // 📋 Render reminder cards
  return (
    <div className="space-y-4">
      {reminders.map((reminder) => (
        <Card key={`${reminder.billId}-${reminder.dueDate}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{reminder.billName}</CardTitle>
              {onDisableReminder && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDisableReminder(reminder.billId)}
                  className="text-muted-foreground hover:text-destructive"
                  title="Disable reminder"
                >
                  <BellOff className="h-4 w-4" />
                  <span className="sr-only">Disable reminder</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Due Date:</span>
                <span className="font-medium">{dayjs(reminder.dueDate).format('MMM D, YYYY')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Reminder Date:</span>
                <span className="font-medium">{dayjs(reminder.reminderDate).format('MMM D, YYYY')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Amount:</span>
                <span className="font-medium text-red-600">{formatCurrency(reminder.amount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}