
export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  user_id?: number;
}

export interface Income {
  id: number;
  description: string;
  amount: number;
  date: string;
  source?: string;
  recurring_type?: "once" | "weekly" | "monthly" | "biweekly" | "twice-monthly";
  category_id: number | null;
  created_at?: string;
  user_id?: number;
  is_recurring: boolean;
}

export interface Bill {
  id: number;
  name: string;
  amount: number;
  day: number;
  date?: string;
  isOneTime: boolean;
  isYearly: boolean;
  reminderEnabled: boolean;
  reminderDays: number;
  category_id: number | null;
  user_id?: number;
  created_at?: string;
}

export interface Transaction {
  isPending?: boolean;
  id: number;
  description: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  category_id: number | null;
  created_at?: string;
  user_id?: number;
  recurring_type?: "once" | "weekly" | "monthly" | "biweekly" | "twice-monthly";
  is_recurring: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface TransactionDialogProps extends DialogProps {
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  defaultValues?: Partial<Income> | Partial<Bill>;
  selectedDate?: Date;
  type: "income" | "expense";
  categories: Category[];
}

export interface ReportFilters {
  startDate: string;
  endDate: string;
  categories?: number[];
  incomeType?: string;
  search?: string;
}

export interface DayTransactions {
  day: number;
  incomes: Income[];
  bills: Bill[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
}
