// User types
export interface User {
  id: number;
  username: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

// Category types
export interface Category {
  id: number;
  name: string;
  icon?: string;
  color?: string;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
}


// Income types
export interface Income {
  id: number;
  source: string;
  amount: number;
  date: string;
  category_id?: number | null;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
  occurrenceType?: 'one-time' | 'monthly' | 'biweekly' | 'twice-monthly';
}

// Bill types
export type Bill = {
  id: number;
  name: string;
  amount: number;
  due_date?: string;
  category_id: number | null;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
  paid?: boolean;
  recurring?: boolean;
  frequency?: string;
  start_date?: string;
  end_date?: string | null;
  occurrence_days?: number[] | null;
  reminderDays?: number;
  date?: string;
  isOneTime?: boolean;
  isYearly?: boolean;
  day?: number;
};

export type Expense = {
  id: number;
  amount: number;
  description: string;
  date: string;
  category_id: number;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
};

// Daily transaction type
export interface DailyTransaction {
  day: number;
  incomes: Income[];
  bills: Bill[];
  expenses: Expense[];
}

// Budget type
export interface Budget {
  id: number;
  category_id: number;
  amount: number;
  month: number;
  year: number;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
}

// DateRange type
export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

// Toast notification type
export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}