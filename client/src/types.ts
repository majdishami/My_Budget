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
 * @property id - Unique identifier for the income entry
 * @property source - Source/name of the income (e.g., "Salary", "Freelance")
 * @property amount - Monetary value of the income
 * @property date - ISO string representing when the income is received
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
 * @property id - Unique identifier for the bill
 * @property name - Descriptive name of the bill
 * @property amount - Amount due for the bill
 * @property day - Day of month when the bill is due (1-31)
 * @property reminderEnabled - Optional flag for reminder settings
 * @property reminderDays - Optional days before due date for reminder
 */
export interface Bill {
  id: string;
  name: string;
  amount: number;
  day: number;
  reminderEnabled?: boolean;
  reminderDays?: number;
}

/**
 * 🔔 BillReminder Interface
 * Represents a specific reminder instance for a bill
 * @property billId - References the associated bill
 * @property billName - Name of the bill (for display purposes)
 * @property dueDate - The actual date when payment is due
 * @property amount - Amount to be paid
 * @property reminderDate - Date when the reminder should be triggered
 */
export interface BillReminder {
  billId: string;
  billName: string;
  dueDate: string;
  amount: number;
  reminderDate: string;
}