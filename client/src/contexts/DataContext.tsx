import { createContext, useContext, useState, useEffect } from "react";
import { Income, Bill } from "@/types";
import dayjs from "dayjs";
import { logger } from "@/lib/logger";
import { incomeSchema, billSchema } from "@/lib/validation";

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

      console.log('[DataContext] Starting to fetch transactions...');
      const response = await fetch('/api/transactions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DataContext] Failed to fetch transactions:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`Failed to load transactions: ${response.status} ${response.statusText}`);
      }

      const transactions = await response.json();
      console.log('[DataContext] Successfully fetched transactions:', transactions);

      const loadedIncomes = transactions
        .filter((t: any) => t.type === 'income')
        .map((t: any) => ({
          id: t.id.toString(),
          source: t.description,
          amount: parseFloat(t.amount),
          date: t.date,
          occurrenceType: t.recurring_id ? 'recurring' : 'once'
        }));

      setIncomes(loadedIncomes);
      console.log('[DataContext] Processed and set incomes:', loadedIncomes);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load data";
      logger.error("[DataContext] Error loading data:", { error });
      setError(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Add a new income
  const addIncome = async (income: Income) => {
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

  return (
    <DataContext.Provider value={{
      incomes,
      bills,
      saveIncomes: async (newIncomes) => {
        await Promise.all(newIncomes.map(income => addIncome(income)));
      },
      saveBills: async (newBills) => {
        // Implement if needed
      },
      addIncome,
      addBill: async () => {
        // Implement if needed
      },
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
              type: isIncome ? 'income' : 'expense'
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
          await loadData();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to reset data";
          logger.error("Error in resetData:", { error });
          setError(new Error(errorMessage));
          throw error;
        }
      },
      refresh: loadData,
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