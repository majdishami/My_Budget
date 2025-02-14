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
      logger.info("[DataContext] Raw transactions:", transactions);

      // Process incomes with proper date handling
      const loadedIncomes = transactions
        .filter((t: any) => t.type === 'income')
        .map((t: any) => {
          const date = dayjs(t.date);
          const income = {
            id: t.id.toString(),
            source: t.description,
            amount: parseFloat(t.amount),
            date: date.format('YYYY-MM-DD'),
            occurrenceType: t.recurring_id ? 'recurring' : 'once'
          };
          logger.info("[DataContext] Processed income:", income);
          return income;
        });

      logger.info("[DataContext] All processed incomes:", loadedIncomes);
      setIncomes(loadedIncomes);

      // Process bills/expenses with proper date handling
      const loadedBills = transactions
        .filter((t: any) => t.type === 'expense')
        .map((t: any) => {
          const date = dayjs(t.date);
          const bill = {
            id: t.id.toString(),
            name: t.description,
            amount: parseFloat(t.amount),
            date: date.format('YYYY-MM-DD'),
            isOneTime: !t.recurring_id,
            day: date.date(),
            category_id: t.category_id,
            category_name: t.category_name || 'Uncategorized',
            category_color: t.category_color || '#D3D3D3',
            category_icon: t.category_icon
          };
          logger.info("[DataContext] Processed bill:", bill);
          return bill;
        });

      logger.info("[DataContext] All processed bills:", loadedBills);
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

      // Parse and validate the date
      let transactionDate = dayjs(transaction.date);
      if (!transactionDate.isValid()) {
        transactionDate = dayjs(); // Fallback to current date if invalid
        logger.warn("[DataContext] Invalid date detected, using current date as fallback");
      }

      const formattedDate = transactionDate.format('YYYY-MM-DD');

      logger.info("[DataContext] Editing transaction with date:", {
        originalDate: transaction.date,
        formattedDate
      });

      const payload = {
        description: isIncome ? transaction.source : transaction.name,
        amount: Number(transaction.amount),
        date: formattedDate,
        type: isIncome ? 'income' : 'expense',
        category_id: !isIncome ? Number(transaction.category_id) : null,
        day: !isIncome ? transactionDate.date() : null,
        recurring_id: !isIncome && !transaction.isOneTime ? 1 : null
      };

      logger.info("[DataContext] Editing transaction with payload:", payload);

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to edit transaction: ${response.statusText}`);
      }

      await loadData();
      logger.info("[DataContext] Successfully edited transaction");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to edit transaction";
      logger.error("[DataContext] Error in editTransaction:", { error });
      setError(new Error(errorMessage));
      throw error;
    }
  };

  return (
    <DataContext.Provider value={{
      incomes,
      bills,
      saveIncomes: async (newIncomes) => {
        await Promise.all(newIncomes.map(income => ({
          ...income,
          date: dayjs(income.date).format('YYYY-MM-DD')
        })).map(income => addIncome(income)));
      },
      saveBills: async (newBills) => {
        // Implement if needed
      },
      addIncome: async (income) => {
        try {
          setError(null);
          const formattedDate = dayjs(income.date).format('YYYY-MM-DD');

          const response = await fetch('/api/transactions', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              description: income.source,
              amount: income.amount,
              date: formattedDate,
              type: 'income',
              recurring_type: income.occurrenceType
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to add income');
          }

          await loadData();
          logger.info("[DataContext] Successfully added income", { income });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to add income";
          logger.error("[DataContext] Error in addIncome:", { error });
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
          logger.error("[DataContext] Error in deleteTransaction:", { error });
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