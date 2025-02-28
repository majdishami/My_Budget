export interface Transaction {
  id: number;
  user_id: number;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category_id: number | null;
  category_name?: string;
  created_at: string;
  updated_at: string;
  isPending?: boolean;
}