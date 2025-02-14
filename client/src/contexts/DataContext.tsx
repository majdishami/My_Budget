import { createContext, useContext, useState, useEffect } from "react";
import { Income, Bill } from "@/types";
import dayjs from "dayjs";
import { logger } from "@/lib/logger";
import { incomeSchema, billSchema } from "@/lib/validation";
//import { apiRequest } from "@/lib/queryClient";

interface DataContextType {
  incomes: Income[];
  bills: Bill[];
  saveIncomes: (newIncomes: Income[]) => Promise<void>;
  saveBills: (newBills: Bill[]) => Promise<void>;
  addIncome: (income: Income) => Promise<void>;
  addBill: (bill: Bill) => Promise<void>;
  deleteTransaction: (transaction: Income | Bill) => Promise<void>;
  editTransaction: (transaction: Income | Bill) => Promise<void>;
  resetData: () => Promise<void>;
  refresh: () => Promise<void>;
  addIncomeToData: (income: Income) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load transactions from the API
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/transactions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load transactions');
      }

      const transactions = await response.json();
      const loadedIncomes = transactions
        .filter((t: any) => t.type === 'income')
        .map((t: any) => ({
          id: t.id.toString(),
          source: t.description,
          amount: parseFloat(t.amount),
          date: t.date,
          occurrenceType: t.recurring_id ? 'recurring' : 'once'
        }));

      const loadedBills = transactions
        .filter((t: any) => t.type === 'expense')
        .map((t: any) => ({
          id: t.id.toString(),
          name: t.description,
          amount: parseFloat(t.amount),
          date: t.date,
          category_id: t.category_id,
          category_name: t.category_name,
          isOneTime: !t.recurring_id,
          user_id: t.user_id,
          created_at: t.created_at
        }));

      setIncomes(loadedIncomes);
      setBills(loadedBills);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load data";
      logger.error("Error loading data:", { error });
      setError(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addIncomeToData = async (income: Income) => {
    try {
      setError(null);
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: income.source,
          amount: income.amount,
          date: income.date,
          type: 'income',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add income');
      }

      await loadData(); // Refresh data after adding
      logger.info("Successfully added income", { income });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add income";
      logger.error("Error in addIncome:", { error });
      setError(new Error(errorMessage));
      throw error;
    }
  };

  const addBill = async (bill: Bill) => {
    try {
      setError(null);
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: bill.name,
          amount: bill.amount,
          date: bill.date,
          type: 'expense',
          category_id: bill.category_id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add bill');
      }

      await loadData(); // Refresh data after adding
      logger.info("Successfully added bill", { bill });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add bill";
      logger.error("Error in addBill:", { error });
      setError(new Error(errorMessage));
      throw error;
    }
  };

  return (
    <DataContext.Provider value={{
      incomes,
      bills,
      saveIncomes: async (newIncomes) => {
        // Implement batch save if needed
        await Promise.all(newIncomes.map(income => addIncomeToData(income)));
      },
      saveBills: async (newBills) => {
        // Implement batch save if needed
        await Promise.all(newBills.map(bill => addBill(bill)));
      },
      addIncome: addIncomeToData,
      addBill,
      deleteTransaction: async (transaction) => {
        try {
          setError(null);
          const response = await fetch(`/api/transactions/${transaction.id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('Failed to delete transaction');
          }

          await loadData(); // Refresh data after deleting
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to delete transaction";
          logger.error("Error in deleteTransaction:", { error });
          setError(new Error(errorMessage));
          throw error;
        }
      },
      editTransaction: async (transaction) => {
        try {
          setError(null);
          const isIncome = 'source' in transaction;
          const response = await fetch(`/api/transactions/${transaction.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              description: isIncome ? transaction.source : transaction.name,
              amount: transaction.amount,
              date: transaction.date,
              type: isIncome ? 'income' : 'expense',
              category_id: !isIncome ? transaction.category_id : null
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to edit transaction');
          }

          await loadData(); // Refresh data after editing
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to edit transaction";
          logger.error("Error in editTransaction:", { error });
          setError(new Error(errorMessage));
          throw error;
        }
      },
      resetData: async () => {
        try {
          setError(null);
          // Implement if needed - could delete all transactions and recreate defaults
          await loadData();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to reset data";
          logger.error("Error in resetData:", { error });
          setError(new Error(errorMessage));
          throw error;
        }
      },
      refresh: loadData,
      addIncomeToData,
      isLoading,
      error
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}