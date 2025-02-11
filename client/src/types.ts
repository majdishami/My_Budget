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
  category_id: number;
  user_id: number;
  created_at: string;
  date: string;
  // UI-specific properties
  category?: string;
  category_name?: string;
  category_color?: string;
  reminderEnabled?: boolean;
  reminderDays?: number;
  isOneTime?: boolean;
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