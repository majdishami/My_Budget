export interface Income {
  id: string;
  source: string;
  amount: number;
  date: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  day: number;
  reminderEnabled?: boolean;
  reminderDays?: number;
}

export interface BillReminder {
  billId: string;
  billName: string;
  dueDate: string;
  amount: number;
  reminderDate: string;
}