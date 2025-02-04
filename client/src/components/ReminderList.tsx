import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bill, BillReminder } from "@/types";
import { formatCurrency } from "@/lib/utils";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

interface ReminderListProps {
  bills: Bill[];
}

export function ReminderList({ bills }: ReminderListProps) {
  const [reminders, setReminders] = useState<BillReminder[]>([]);

  useEffect(() => {
    // Calculate reminders for the next 30 days
    const today = dayjs();
    const thirtyDaysFromNow = today.add(30, 'day');
    const upcomingReminders: BillReminder[] = [];

    bills.forEach(bill => {
      if (!bill.reminderEnabled) return;

      // Find the next occurrence of this bill
      let nextDueDate = today.date(bill.day);
      if (nextDueDate.isBefore(today)) {
        nextDueDate = nextDueDate.add(1, 'month');
      }

      // Calculate reminder date based on user preferences
      const reminderDate = nextDueDate.subtract(bill.reminderDays || 7, 'day');

      // Only include reminders within the next 30 days
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

    // Sort reminders by reminder date
    upcomingReminders.sort((a, b) => 
      dayjs(a.reminderDate).diff(dayjs(b.reminderDate))
    );

    setReminders(upcomingReminders);
  }, [bills]);

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

  return (
    <div className="space-y-4">
      {reminders.map((reminder) => (
        <Card key={`${reminder.billId}-${reminder.dueDate}`}>
          <CardHeader>
            <CardTitle className="text-lg">{reminder.billName}</CardTitle>
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
