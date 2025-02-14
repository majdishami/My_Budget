import { createContext, useContext, useState, useEffect } from "react";
import { Income, Bill } from "@/types";
import dayjs from "dayjs";
import { logger } from "@/lib/logger";

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

const headers = {
  'Content-Type': 'application/json'
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/transactions', {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to load transactions: ${response.status} ${response.statusText}`);
      }

      const transactions = await response.json();

      // Process incomes
      const loadedIncomes = transactions
        .filter((t: any) => t.type === 'income')
        .map((t: any) => ({
          id: t.id.toString(),
          source: t.description,
          amount: parseFloat(t.amount),
          date: dayjs(t.date).format('YYYY-MM-DD'),
          occurrenceType: t.recurring_id ? 'recurring' : 'once'
        }));

      setIncomes(loadedIncomes);

      // Process bills/expenses
      const loadedBills = transactions
        .filter((t: any) => t.type === 'expense')
        .map((t: any) => {
          const transactionDate = dayjs(t.date);
          return {
            id: t.id.toString(),
            name: t.description,
            amount: parseFloat(t.amount),
            date: transactionDate.format('YYYY-MM-DD'),
            isOneTime: !t.recurring_id,
            day: transactionDate.date(),
            category_id: t.category_id,
            category_name: t.category_name || 'Uncategorized',
            category_color: t.category_color || '#D3D3D3',
            category_icon: t.category_icon
          };
        });

      setBills(loadedBills);
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

  const editTransaction = async (transaction: Income | Bill) => {
    try {
      setError(null);
      const isIncome = 'source' in transaction;

      // Ensure date is in the correct format
      const transactionDate = dayjs(transaction.date).isValid() 
        ? dayjs(transaction.date)
        : dayjs();

      const payload = {
        description: isIncome ? transaction.source : transaction.name,
        amount: Number(transaction.amount),
        date: transactionDate.format('YYYY-MM-DD'),
        type: isIncome ? 'income' : 'expense',
        category_id: !isIncome ? Number(transaction.category_id) : null,
        day: !isIncome ? transactionDate.date() : undefined,
        recurring_id: !isIncome && !transaction.isOneTime ? 1 : null
      };

      logger.info("Editing transaction with payload:", payload);

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error("Edit transaction failed:", {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData.message || `Failed to edit transaction: ${response.statusText}`);
      }

      await loadData();
      logger.info("Successfully edited transaction");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to edit transaction";
      logger.error("Error in editTransaction:", { error });
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
      addIncome: async (income) => {
        try {
          setError(null);
          const response = await fetch('/api/transactions', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              description: income.source,
              amount: income.amount,
              date: income.date,
              type: 'income',
              recurring_type: income.occurrenceType,
              first_date: income.firstDate,
              second_date: income.secondDate
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to add income');
          }

          await loadData();
          logger.info("Successfully added income", { income });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to add income";
          logger.error("Error in addIncome:", { error });
          setError(new Error(errorMessage));
          throw error;
        }
      },
      addBill: async (bill) => {
        // Implement if needed
      },
      deleteTransaction: async (transaction) => {
        try {
          setError(null);
          const response = await fetch(`/api/transactions/${transaction.id}`, {
            method: 'DELETE',
            headers
          });

          if (!response.ok) {
            throw new Error('Failed to delete transaction');
          }

          await loadData();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to delete transaction";
          logger.error("Error in deleteTransaction:", { error });
          setError(new Error(errorMessage));
          throw error;
        }
      },
      editTransaction,
      resetData: loadData,
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