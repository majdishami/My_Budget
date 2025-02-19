import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import dayjs from 'dayjs';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(amount));
}

// Generate a numeric ID for new transactions
export function generateId(): number {
  // Use timestamp for uniqueness but ensure it's a positive integer
  return Math.floor(Date.now() / 1000);
}

// Get current date dynamically
export function getCurrentDate() {
  return dayjs(); // Always return the actual current date
}