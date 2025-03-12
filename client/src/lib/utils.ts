import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from 'dayjs';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs)); // Combines inputs using clsx and merges with twMerge
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(amount)); // Rounds to nearest integer and formats as currency
}

// Generate a numeric ID for new transactions
export function generateId(): number {
  return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000); // Adding a random factor for more uniqueness
}

// Get current date dynamically
export function getCurrentDate() {
  return dayjs(); // Always return the actual current date
}
