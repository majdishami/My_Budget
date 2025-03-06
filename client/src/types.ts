/**
 * 🏷️ Category Interface
 * Represents a transaction category
 */
export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
}

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
  id: string; // Unique identifier for the income
  source: string; // Source of the income (e.g., "Salary", "Freelance")
  amount: number; // Amount of the income
  date: string; // Date of the income in ISO format (YYYY-MM-DD)
  occurrenceType: string; // Type of occurrence (e.g., "once", "monthly", "biweekly", "twice-monthly")
  firstDate?: number; // First payment day of the month (optional)
  secondDate?: number; // Second payment day of the month (optional)
}

/**
 * 💳 Bill Interface
 * Represents a recurring bill or expense
 */
export interface Bill {
  reminderEnabled: any;
  reminderDays: number;
  isYearly: any;
  date: string | number | Date;
  category_id(category_id: any): string;
  description: any;
  id: string;
  name: string;
  amount: number;
  day: number;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: 'income' | 'expense';
  categoryId?: string;
}

export interface DayData {
  date: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  incomes: Income[];
  bills: Bill[];
  totalIncome: number;
  totalBills: number;
  balance: number;
}

/**
 * 🔔 BillReminder Interface
 * Represents a specific reminder instance for a bill
 */
export interface BillReminder {
  billId: number;  // Changed from string to number
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
  categories: Category[];
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