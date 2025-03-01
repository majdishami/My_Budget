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
import React from "react";
import { useEffect, useState } from "react";

export default function ExpenseReport() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    // Mock data for now - would fetch from API
    setTimeout(() => {
      setExpenses([
        { id: 1, description: "Rent", amount: 1500, date: "2025-02-15" },
        { id: 2, description: "Groceries", amount: 350, date: "2025-02-10" },
        { id: 3, description: "Utilities", amount: 200, date: "2025-02-05" }
      ]);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return <div className="p-4">Loading expenses...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Expense Report</h1>
      <div className="border rounded shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.map((expense: any) => (
              <tr key={expense.id}>
                <td className="px-6 py-4 whitespace-nowrap">{expense.description}</td>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(expense.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  ${expense.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
