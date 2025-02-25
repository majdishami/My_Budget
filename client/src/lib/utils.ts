
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

export function getCurrentDate() {
  return new Date()
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

export function getCurrentDate() {
  return new Date()
}

export function generateId() {
  return Math.random().toString(36).substr(2, 9)
}
