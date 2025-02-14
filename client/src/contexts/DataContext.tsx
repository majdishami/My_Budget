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
        throw new Error(`Failed to load transactions: ${response.status} ${response.statusText}`);
      }

      const transactions = await response.json();
      console.log('[DataContext] Raw transactions:', transactions);

      // Process incomes
      const loadedIncomes = transactions
        .filter((t: any) => t.type === 'income')
        .map((t: any) => ({
          id: t.id.toString(),
          source: t.description,
          amount: parseFloat(t.amount),
          date: dayjs(t.date).format('YYYY-MM-DD'),
          occurrenceType: t.recurring_type || 'once',
          firstDate: t.first_date,
          secondDate: t.second_date
        }));

      setIncomes(loadedIncomes);

      // Process bills/expenses
      const loadedBills = transactions
        .filter((t: any) => t.type === 'expense')
        .map((t: any) => ({
          id: t.id.toString(),
          name: t.description,
          amount: parseFloat(t.amount),
          date: dayjs(t.date).format('YYYY-MM-DD'),
          isOneTime: !t.recurring_id,
          day: dayjs(t.date).date(),
          category_id: t.category_id,
          category_name: t.category_name,
          category_color: t.category_color,
          category_icon: t.category_icon,
          category: t.category_id ? {
            name: t.category_name,
            color: t.category_color,
            icon: t.category_icon
          } : undefined
        }));

      setBills(loadedBills);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load data";
      logger.error("[DataContext] Error loading data:", { error });
      setError(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new income
  const addIncome = async (income: Income) => {
    try {
      setError(null);
      logger.info("[DataContext] Adding income:", { income });

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: income.source,
          amount: income.amount,
          date: dayjs(income.date).format('YYYY-MM-DD'),
          type: 'income'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to add income: ${response.status} ${response.statusText}${errorData.message ? ` - ${errorData.message}` : ''}`);
      }

      await loadData();
      logger.info("Successfully added income", { income });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add income";
      logger.error("Error in addIncome:", { error });
      setError(new Error(errorMessage));
      throw error;
    }
  };

  // Add a new bill
  const addBill = async (bill: Bill) => {
    try {
      setError(null);
      logger.info("[DataContext] Adding bill:", { bill });

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: bill.name,
          amount: bill.amount,
          date: dayjs(bill.date).format('YYYY-MM-DD'),
          type: 'expense',
          category_id: bill.category_id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to add bill: ${response.status} ${response.statusText}${errorData.message ? ` - ${errorData.message}` : ''}`);
      }

      await loadData();
      logger.info("Successfully added bill", { bill });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add bill";
      logger.error("Error in addBill:", { error });
      setError(new Error(errorMessage));
      throw error;
    }
  };

  // Delete a transaction
  const deleteTransaction = async (transaction: Income | Bill) => {
    try {
      setError(null);
      logger.info("[DataContext] Deleting transaction:", { transaction });

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to delete transaction: ${response.status} ${response.statusText}${errorData.message ? ` - ${errorData.message}` : ''}`);
      }

      await loadData();
      logger.info("Successfully deleted transaction", { transaction });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete transaction";
      logger.error("Error in deleteTransaction:", { error });
      setError(new Error(errorMessage));
      throw error;
    }
  };

  // Edit a transaction
  const editTransaction = async (transaction: Income | Bill) => {
    try {
      setError(null);
      const isIncome = 'source' in transaction;
      logger.info("[DataContext] Editing transaction:", { 
        transaction,
        type: isIncome ? 'income' : 'expense'
      });

      // Format the transaction data
      const transactionData = {
        description: isIncome ? transaction.source : transaction.name,
        amount: transaction.amount,
        date: dayjs(transaction.date).format('YYYY-MM-DD'),
        type: isIncome ? 'income' : 'expense',
        category_id: !isIncome ? (transaction as Bill).category_id : undefined
      };

      logger.info("[DataContext] Formatted transaction data:", transactionData);

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactionData),
      });

      const responseData = await response.json().catch(() => ({}));
      logger.info("[DataContext] Edit transaction response:", { 
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });

      if (!response.ok) {
        throw new Error(`Failed to edit transaction: ${response.status} ${response.statusText}${responseData.message ? ` - ${responseData.message}` : ''}`);
      }

      await loadData();
      logger.info("Successfully edited transaction", { transaction });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to edit transaction";
      logger.error("Error in editTransaction:", { error, transaction });
      setError(new Error(errorMessage));
      throw error;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <DataContext.Provider value={{
      incomes,
      bills,
      saveIncomes: async (newIncomes) => {
        await Promise.all(newIncomes.map(income => addIncome(income)));
      },
      saveBills: async (newBills) => {
        await Promise.all(newBills.map(bill => addBill(bill)));
      },
      addIncome,
      addBill,
      deleteTransaction,
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