import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import dayjs from "dayjs";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return dayjs(date).format("MMMM D, YYYY");
}

export function getCurrentDate() {
  return dayjs();
}

export function toast(props: { 
  title?: string; 
  description?: string; 
  variant?: 'default' | 'destructive';
  duration?: number;
}) {
  // This is a placeholder function that will be replaced by the actual toast hook
  console.log("Toast:", props);
}
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
