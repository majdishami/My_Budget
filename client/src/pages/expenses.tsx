import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';

const fetchExpenses = async () => {
  const response = await axios.get('/api/expenses');
  return response.data;
};

const ExpenseReportPage: React.FC = () => {
  const { toast } = useToast();
  const { data: expenses, isLoading, isError } = useQuery({
    queryKey: ['expenses'],
    queryFn: fetchExpenses,
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to load expenses. Please try again later.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) return <div>Loading expenses...</div>;
  if (isError) return <div>Error loading expenses</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Expense Report</h1>

      <div className="bg-white shadow rounded-lg p-4">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Date</th>
              <th className="py-2 px-4 border-b">Category</th>
              <th className="py-2 px-4 border-b">Amount</th>
              <th className="py-2 px-4 border-b">Description</th>
            </tr>
          </thead>
          <tbody>
            {expenses && expenses.map((expense: any) => (
              <tr key={expense.id}>
                <td className="py-2 px-4 border-b">{format(new Date(expense.date), 'yyyy-MM-dd')}</td>
                <td className="py-2 px-4 border-b">{expense.category.name}</td>
                <td className="py-2 px-4 border-b">${expense.amount.toFixed(2)}</td>
                <td className="py-2 px-4 border-b">{expense.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpenseReportPage;