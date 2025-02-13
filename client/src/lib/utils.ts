import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import dayjs from 'dayjs';

export function cn(...inputs: ClassValue[]): string {
  // Ensure we always return a string, even for edge cases
  try {
    return twMerge(clsx(inputs.filter(input => 
      typeof input === 'string' || 
      typeof input === 'number' || 
      typeof input === 'boolean' ||
      (typeof input === 'object' && input !== null)
    )));
  } catch (error) {
    console.warn('Error merging classes:', error);
    // Fallback to a safe default if something goes wrong
    return '';
  }
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(amount));
}

// Browser-compatible UUID v4 generation
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomStr}`;
}

// Get current date dynamically
export function getCurrentDate() {
  return dayjs(); // Always return the actual current date
}