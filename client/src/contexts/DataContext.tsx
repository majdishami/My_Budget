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
  addIncomeToData: (income: Income) => void;
  isLoading: boolean;
  error: Error | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper function to expand recurring income into multiple entries
const expandRecurringIncome = (baseIncome: Income, months: number = 12) => {
  const incomes: Income[] = [];
  if (baseIncome.occurrenceType === 'once') {
    return [baseIncome];
  }

  const baseDate = dayjs(baseIncome.date);

  for (let i = 0; i < months; i++) {
    let date;
    switch (baseIncome.occurrenceType) {
      case 'monthly':
        date = baseDate.add(i, 'month');
        break;
      case 'biweekly':
        date = baseDate.add(i * 2, 'week');
        break;
      case 'twice-monthly':
        if (baseIncome.firstDate && baseIncome.secondDate) {
          const monthDate = baseDate.add(Math.floor(i / 2), 'month');
          date = i % 2 === 0
            ? monthDate.date(baseIncome.firstDate)
            : monthDate.date(baseIncome.secondDate);
        } else {
          date = baseDate.add(i * 2, 'week');
        }
        break;
      case 'weekly':
        date = baseDate.add(i, 'week');
        break;
      default:
        date = baseDate;
    }

    // For recurring entries, create a numeric ID based on the base ID
    const instanceId = baseIncome.occurrenceType === 'once'
      ? baseIncome.id
      : Number(`${baseIncome.id}${i + 1}`);

    incomes.push({
      ...baseIncome,
      id: instanceId,
      date: date.format('YYYY-MM-DD')
    });
  }

  return incomes;
};

// Helper function to get base ID from instance ID
const getBaseId = (id: number) => Math.floor(id / 10);

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
        const loadedIncomes = transactions
          .filter((t: any) => t.type === 'income')
          .map((t: any) => ({
            id: t.id,
            source: t.description || 'Unknown Source',
            amount: parseFloat(t.amount) || 0,
            date: dayjs(t.date).isValid() ? dayjs(t.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
            occurrenceType: t.recurring_type || 'once',
            firstDate: t.first_date,
            secondDate: t.second_date
          }))
          .reduce((acc: Income[], income) => {
            return [...acc, ...expandRecurringIncome(income)];
          }, []);

        setIncomes(loadedIncomes);

        const loadedBills = transactions
          .filter((t: any) => t.type === 'expense')
          .map((t: any) => ({
            id: t.id,
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
      sessionStorage.setItem("transactions", JSON.stringify(transactions));
      logger.info("[DataContext] Cached transactions in sessionStorage");

      const loadedIncomes = transactions
        .filter((t: any) => t.type === 'income')
        .map((t: any) => ({
          id: t.id,
          source: t.description || 'Unknown Source',
          amount: parseFloat(t.amount) || 0,
          date: dayjs(t.date).isValid() ? dayjs(t.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
          occurrenceType: t.recurring_type || 'once',
          firstDate: t.first_date,
          secondDate: t.second_date
        }))
        .reduce((acc: Income[], income) => {
          return [...acc, ...expandRecurringIncome(income)];
        }, []);

      setIncomes(loadedIncomes);

      const loadedBills = transactions
        .filter((t: any) => t.type === 'expense')
        .map((t: any) => ({
          id: t.id,
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load data";
      logger.error("[DataContext] Error loading data:", { error });
      setError(new Error(errorMessage));
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
          type: 'income',
          recurring_type: income.occurrenceType,
          first_date: income.firstDate,
          second_date: income.secondDate
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to add income: ${response.status} ${response.statusText}${errorData.message ? ` - ${errorData.message}` : ''}`);
      }

      const newTransaction = await response.json();
      logger.info("[DataContext] Successfully added income to database:", newTransaction);

      // Clear cache first
      sessionStorage.removeItem("transactions");

      // Force a complete data refresh
      await loadData();

      logger.info("[DataContext] Successfully added income and refreshed data");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add income";
      logger.error("[DataContext] Error in addIncome:", { error });
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

      setBills(prev => [...prev, bill]);
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
      logger.info("[DataContext] Starting deletion of transaction:", transaction);

      // Ensure we have a valid transaction object with an ID
      if (!transaction || typeof transaction.id !== 'number') {
        logger.error("[DataContext] Invalid transaction ID:", { id: transaction?.id, type: typeof transaction?.id });
        throw new Error('Invalid transaction: Transaction object is required with a numeric ID');
      }

      // Use the raw ID without any transformation
      const transactionId = transaction.id;

      logger.info("[DataContext] Deleting transaction:", {
        id: transactionId,
        type: 'source' in transaction ? 'income' : 'bill'
      });

      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || response.statusText;
        throw new Error(`Failed to delete transaction: ${response.status} ${errorMessage}`);
      }

      // Update local state based on transaction type
      if ('source' in transaction) {
        setIncomes(prev => prev.filter(inc => inc.id !== transaction.id));
      } else {
        setBills(prev => prev.filter(bill => bill.id !== transaction.id));
      }

      // Clear cache and force refresh
      sessionStorage.removeItem("transactions");
      await loadData();

      logger.info("[DataContext] Successfully deleted transaction");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete transaction";
      logger.error("[DataContext] Error in deleteTransaction:", { error });
      setError(new Error(errorMessage));
      throw error;
    }
  };

  // Edit a transaction
  const editTransaction = async (transaction: Income | Bill) => {
    try {
      setError(null);
      const isIncome = 'source' in transaction;
      const baseId = getBaseId(transaction.id);

      logger.info("[DataContext] Editing transaction:", {
        transaction,
        baseId,
        type: isIncome ? 'income' : 'expense'
      });

      const response = await fetch(`/api/transactions/${baseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: isIncome ? transaction.source : transaction.name,
          amount: transaction.amount,
          date: dayjs(transaction.date).format('YYYY-MM-DD'),
          type: isIncome ? 'income' : 'expense',
          recurring_type: isIncome ? (transaction as Income).occurrenceType : undefined,
          first_date: isIncome ? (transaction as Income).firstDate : undefined,
          second_date: isIncome ? (transaction as Income).secondDate : undefined,
          category_id: !isIncome ? (transaction as Bill).category_id : undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to edit transaction: ${response.status} ${response.statusText}${errorData.message ? ` - ${errorData.message}` : ''}`);
      }

      // Update local state
      if (isIncome) {
        const baseTransactionId = getBaseId(transaction.id);
        const expandedIncomes = expandRecurringIncome(transaction as Income);
        setIncomes(prev => {
          const filtered = prev.filter(inc => getBaseId(inc.id) !== baseTransactionId);
          return [...filtered, ...expandedIncomes];
        });
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
    const expandedIncomes = expandRecurringIncome(income);
    setIncomes(prev => [...prev, ...expandedIncomes]);
    logger.info("[DataContext] Added income to local state:", { income, expandedCount: expandedIncomes.length });
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
    throw new Error("[DataContext] `useData()` must be used within `<DataProvider>`.");
  }
  return context;
}