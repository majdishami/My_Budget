/**
 * ==============================================
 * 📝 Core Type Definitions
 * ==============================================
 * This file contains the core interfaces used throughout
 * the budget tracking application. These types ensure
 * consistency in data structure across components.
 */

/**
 * 💰 Income Interface
 * Represents a single income entry in the system
 */
export interface Income {
  id: string;
  source: string;
  amount: number;
  date: string;
  occurrenceType: 'once' | 'weekly' | 'monthly' | 'biweekly' | 'twice-monthly';
  firstDate?: number;  // Day of month for first occurrence (1-31)
  secondDate?: number; // Day of month for second occurrence (1-31)
}

/**
 * 💳 Bill Interface
 * Represents a recurring bill or expense
 */
export interface Bill {
  id: string;
  name: string;
  amount: number;
  day: number;
  category_id: number;
  user_id: number;
  created_at: string;
  isOneTime: boolean;
  date?: string;
  category?: string;
  category_name: string;
  category_color?: string;
  reminderEnabled?: boolean;
  reminderDays?: number;
}

/**
 * 🔔 BillReminder Interface
 * Represents a specific reminder instance for a bill
 */
export interface BillReminder {
  billId: string;
  billName: string;
  dueDate: string;
  amount: number;
  reminderDate: string;
}

/**
 * 🔄 OccurrenceType
 * Defines how often a transaction occurs
 */
export type OccurrenceType = 'once' | 'monthly' | 'biweekly' | 'twice-monthly';

/**
 * 📊 DataContextType
 * Defines the shape of the data context
 */
export interface DataContextType {
  isLoading: boolean;
  error: Error | null;
  incomes: Income[];
  bills: Bill[];
  saveIncomes: (newIncomes: Income[]) => Promise<void>;
  saveBills: (newBills: Bill[]) => Promise<void>;
  addIncome: (income: Income) => void;
  addBill: (bill: Bill) => void;
  deleteTransaction: (transaction: Income | Bill) => void;
  editTransaction: (transaction: Income | Bill) => void;
  resetData: () => Promise<void>;
  refresh: () => Promise<void>;
  addIncomeToData: (income: Income) => void;
}