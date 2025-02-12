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
  category_name: string;  // Changed from optional to required
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
export type OccurrenceType = 'once' | 'monthly' | 'biweekly' | 'weekly';

/**
 * 📊 DataContextType
 * Defines the shape of the data context
 */
export interface DataContextType {
  isLoading: boolean;
  error: Error | null;
  incomes: Income[];
  bills: Bill[];
  deleteTransaction: (transaction: Income | Bill) => void;
  editTransaction: (transaction: Income | Bill) => void;
  addIncomeToData: (income: Income) => void;
  addBill: (bill: Bill) => void;
  refresh: () => Promise<void>;
}