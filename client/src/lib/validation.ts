import { z } from "zod";

export const incomeSchema = z.object({
  id: z.string(),
  source: z.string().min(1, "Source is required"),
  amount: z.number().positive("Amount must be positive"),
  date: z.string(),
  occurrenceType: z.enum(['once', 'weekly', 'monthly', 'biweekly', 'twice-monthly']),
  firstDate: z.number().min(1).max(31).optional(),
  secondDate: z.number().min(1).max(31).optional(),
});

export const billSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  amount: z.number().positive("Amount must be positive"),
  day: z.number().min(1).max(31).optional(),
  date: z.string().optional(),
  category_id: z.number(),
  user_id: z.number(),
  created_at: z.string(),
  isOneTime: z.boolean(),
  category: z.string().optional(),
  category_name: z.string(),
  category_color: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderDays: z.number().optional(),
});

export type Income = z.infer<typeof incomeSchema>;
export type Bill = z.infer<typeof billSchema>;