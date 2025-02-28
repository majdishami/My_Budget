
export type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

export interface Category {
  id: number;
  name: string;
  color?: string;
  icon?: string;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Income {
  id: number;
  source: string;
  amount: number;
  date: string;
  notes?: string;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
  occurrenceType: 'once' | 'weekly' | 'monthly' | 'biweekly' | 'twice-monthly';
  is_recurring: boolean;
}

export interface Bill {
  id: number;
  name: string;
  amount: number;
  date: string;
  category_id: number | null;
  notes?: string;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
  is_paid?: boolean;
  due_date?: string;
  occurrenceType?: 'once' | 'weekly' | 'monthly' | 'biweekly' | 'twice-monthly';
  is_recurring?: boolean;
  day?: number;
  isOneTime?: boolean;
  isYearly?: boolean;
  reminder?: boolean;
  reminderDays?: number;
}

export interface DayTransaction {
  day: number;
  totalIncomes: number;
  totalBills: number;
  incomes: Income[];
  bills: Bill[];
}

export interface MonthData {
  incomes: Income[];
  bills: Bill[];
  balance: number;
  dayTransactions: DayTransaction[];
}

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: LogContext;
  stack?: string;
}

export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  categories: number[];
  minAmount: number;
  maxAmount: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}
