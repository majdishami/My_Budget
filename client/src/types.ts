export interface Income {
  id: string;
  name: string;
  amount: number;
  occurrence: 'once' | 'monthly' | 'biweekly' | 'weekly';
  startDate: Date;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
}