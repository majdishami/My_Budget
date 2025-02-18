import { createContext, useContext, useState, useEffect } from "react";
import { Income, Bill } from "@/types";
import dayjs from "dayjs";
import { logger } from "@/lib/logger";
import crypto from 'crypto';

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
  addIncomeToData: (income: Income) => void;
  isLoading: boolean;
  error: Error | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper function to process transactions
const processTransactions = (transactions: any[], setIncomes: Function, setBills: Function) => {
  try {
    // Process incomes
    const loadedIncomes = transactions
      .filter((t: any) => t.type === 'income')
      .map((t: any) => ({
        id: t.id?.toString() || crypto.randomUUID(),
        source: t.description || 'Unknown Source',
        amount: parseFloat(t.amount) || 0,
        date: dayjs(t.date).isValid() ? dayjs(t.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        occurrenceType: t.recurring_type || 'once',
        firstDate: t.first_date,
        secondDate: t.second_date
      }));

    setIncomes(loadedIncomes);
    logger.info("[DataContext] Processed incomes:", { count: loadedIncomes.length });

    // Process bills
    const loadedBills = transactions
      .filter((t: any) => t.type === 'expense')
      .map((t: any) => ({
        id: t.id?.toString() || crypto.randomUUID(),
        name: t.description || 'Unknown Expense',
        amount: parseFloat(t.amount) || 0,
        date: dayjs(t.date).isValid() ? dayjs(t.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        isOneTime: !t.recurring_id,
        day: dayjs(t.date).date(),
        category_id: t.category_id || null,
        category_name: t.category_name || 'Uncategorized',
        category_color: t.category_color || '#808080',
        category_icon: t.category_icon || 'help-circle',
        category: t.category_id ? {
          name: t.category_name || 'Uncategorized',
          color: t.category_color || '#808080',
          icon: t.category_icon || 'help-circle'
        } : undefined
      }));

    setBills(loadedBills);
    logger.info("[DataContext] Processed bills:", { count: loadedBills.length });
  } catch (error) {
    logger.error("[DataContext] Error processing transactions:", { error });
    setIncomes([]);
    setBills([]);
    throw error;
  }
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load transactions from cache or API
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check sessionStorage before fetching
      const cachedTransactions = sessionStorage.getItem("transactions");
      if (cachedTransactions) {
        logger.info("[DataContext] Loading transactions from cache...");
        const transactions = JSON.parse(cachedTransactions);
        processTransactions(transactions, setIncomes, setBills);
        setIsLoading(false);
        return;
      }

      logger.info("[DataContext] Fetching transactions from API...");
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
      // Cache the raw transactions
      sessionStorage.setItem("transactions", JSON.stringify(transactions));
      logger.info("[DataContext] Cached transactions in sessionStorage");

      processTransactions(transactions, setIncomes, setBills);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load data";
      logger.error("[DataContext] Error loading data:", { error });
      setError(new Error(errorMessage));
      // Set empty arrays as fallback
      setIncomes([]);
      setBills([]);
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

      // Update local state directly
      setIncomes(prev => [...prev, income]);
      // Invalidate cache to ensure fresh data on next load
      sessionStorage.removeItem("transactions");
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

      // Update local state directly
      setBills(prev => [...prev, bill]);
      // Invalidate cache to ensure fresh data on next load
      sessionStorage.removeItem("transactions");
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

      // Update local state directly
      if ('source' in transaction) {
        setIncomes(prev => prev.filter(inc => inc.id !== transaction.id));
      } else {
        setBills(prev => prev.filter(bill => bill.id !== transaction.id));
      }

      // Invalidate cache
      sessionStorage.removeItem("transactions");
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

      const transactionData = {
        description: isIncome ? transaction.source : transaction.name,
        amount: transaction.amount,
        date: dayjs(transaction.date).format('YYYY-MM-DD'),
        type: isIncome ? 'income' : 'expense',
        category_id: !isIncome ? (transaction as Bill).category_id : undefined
      };

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to edit transaction: ${response.status} ${response.statusText}${errorData.message ? ` - ${errorData.message}` : ''}`);
      }

      // Update local state directly
      if (isIncome) {
        setIncomes(prev => prev.map(inc =>
          inc.id === transaction.id ? transaction as Income : inc
        ));
      } else {
        setBills(prev => prev.map(bill =>
          bill.id === transaction.id ? transaction as Bill : bill
        ));
      }

      // Invalidate cache
      sessionStorage.removeItem("transactions");
      logger.info("Successfully edited transaction", { transaction });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to edit transaction";
      logger.error("Error in editTransaction:", { error });
      setError(new Error(errorMessage));
      throw error;
    }
  };

  // Function to add income directly to state without API call
  const addIncomeToData = (income: Income) => {
    setIncomes(prev => [...prev, income]);
    logger.info("[DataContext] Added income to local state:", { income });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save multiple incomes
  const saveIncomes = async (newIncomes: Income[]) => {
    await Promise.all(newIncomes.map(income => addIncome(income)));
  };

  // Save multiple bills
  const saveBills = async (newBills: Bill[]) => {
    await Promise.all(newBills.map(bill => addBill(bill)));
  };

  return (
    <DataContext.Provider value={{
      incomes,
      bills,
      saveIncomes,
      saveBills,
      addIncome,
      addBill,
      deleteTransaction,
      editTransaction,
      resetData: loadData,
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
  if (!context) {
    throw new Error("[DataContext] `useData` must be used within a DataProvider component.");
  }
  return context;
}