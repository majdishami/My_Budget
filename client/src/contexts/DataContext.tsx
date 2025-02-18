import { createContext, useContext, useState, useEffect } from "react";
import { Income, Bill, Category } from "@/types";
import dayjs from "dayjs";
import { logger } from "@/lib/logger";

interface DataContextType {
  incomes: Income[];
  bills: Bill[];
  categories: Category[];
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

interface CacheData {
  timestamp: number;
  version: number;
  transactions: any[];
  lastModified?: string; // Add last modified tracking
}

const CACHE_VERSION = 1;
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

const DataContext = createContext<DataContextType | undefined>(undefined);

// Utility function for generating instance IDs for recurring transactions
const generateInstanceId = (baseId: number, index: number): number => {
  if (typeof baseId !== 'number' || isNaN(baseId)) {
    throw new Error('Invalid base ID: must be a number');
  }
  // Use multiplication to create unique IDs that can be easily reversed
  // This ensures we can get back to the base ID
  return baseId * 100 + (index + 1);
};

// Helper function to get base ID from instance ID
const getBaseId = (instanceId: number): number => {
  if (typeof instanceId !== 'number' || isNaN(instanceId)) {
    throw new Error('Invalid instance ID: must be a number');
  }
  return Math.floor(instanceId / 100);
};

// Helper function to expand recurring income into multiple entries
const expandRecurringIncome = (baseIncome: Income, months: number = 12) => {
  const incomes: Income[] = [];

  // Validate date before processing
  if (!baseIncome.date || !dayjs(baseIncome.date).isValid()) {
    logger.error("[DataContext] Invalid date in income:", { income: baseIncome });
    throw new Error('Invalid date format in income');
  }

  // Validate ID
  if (typeof baseIncome.id !== 'number' || isNaN(baseIncome.id)) {
    logger.error("[DataContext] Invalid income ID:", { income: baseIncome });
    throw new Error('Invalid income ID: must be a number');
  }

  // For one-time income, return as is
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
        logger.error("[DataContext] Unknown occurrence type:", {
          type: baseIncome.occurrenceType,
          income: baseIncome
        });
        throw new Error(`Unknown occurrence type: ${baseIncome.occurrenceType}`);
    }

    // Validate generated date
    if (!date.isValid()) {
      logger.error("[DataContext] Generated invalid date:", {
        date: date.format(),
        income: baseIncome
      });
      continue;
    }

    // Generate instance ID using the new function
    const instanceId = generateInstanceId(baseIncome.id, i);

    incomes.push({
      ...baseIncome,
      id: instanceId,
      date: date.format('YYYY-MM-DD')
    });
  }

  logger.info("[DataContext] Expanded recurring income:", {
    baseId: baseIncome.id,
    occurrenceType: baseIncome.occurrenceType,
    instanceCount: incomes.length
  });

  return incomes;
};

// Utility function for handling API requests
const fetchJsonWithErrorHandling = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, options);
    const responseText = await response.text();

    if (!response.ok) {
      logger.error("[DataContext] API request failed:", {
        url,
        status: response.status,
        statusText: response.statusText,
        responseText
      });

      let errorData = {};
      try {
        errorData = JSON.parse(responseText);
      } catch (parseError) {
        logger.error("[DataContext] Failed to parse error response as JSON:", {
          parseError,
          responseText
        });
      }

      throw new Error(
        `Request failed (${response.status}): ${
          errorData.message ? errorData.message :
            responseText ? responseText :
              response.statusText
        }`
      );
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      logger.error("[DataContext] Failed to parse success response as JSON:", {
        parseError,
        responseText
      });
      throw new Error("Invalid JSON response from server");
    }
  } catch (error) {
    logger.error("[DataContext] Request failed:", {
      url,
      error: error instanceof Error ? error.message : "Unknown error"
    });
    throw error;
  }
};


// Utility function for cache management
const getCacheKey = () => 'transactions_cache';

const getCache = (): CacheData | null => {
  try {
    const cached = sessionStorage.getItem(getCacheKey());
    if (!cached) {
      logger.info("[DataContext] No cache found");
      return null;
    }

    let cacheData: CacheData;
    try {
      cacheData = JSON.parse(cached);
      // Validate cache structure
      if (!cacheData.timestamp || !Array.isArray(cacheData.transactions)) {
        throw new Error('Invalid cache structure');
      }
    } catch (parseError) {
      logger.error("[DataContext] Cache data is malformed:", { parseError });
      sessionStorage.removeItem(getCacheKey());
      return null;
    }

    // Validate cache version and age
    const now = Date.now();
    const age = now - cacheData.timestamp;

    if (cacheData.version !== CACHE_VERSION) {
      logger.info("[DataContext] Cache version mismatch:", {
        cachedVersion: cacheData.version,
        currentVersion: CACHE_VERSION
      });
      sessionStorage.removeItem(getCacheKey());
      return null;
    }

    if (age > CACHE_MAX_AGE) {
      logger.info("[DataContext] Cache expired:", {
        age,
        maxAge: CACHE_MAX_AGE,
        expiredBy: age - CACHE_MAX_AGE
      });
      sessionStorage.removeItem(getCacheKey());
      return null;
    }

    return cacheData;
  } catch (error) {
    logger.error("[DataContext] Error reading cache:", error);
    sessionStorage.removeItem(getCacheKey());
    return null;
  }
};

const setCache = (transactions: any[]) => {
  try {
    const cacheData: CacheData = {
      timestamp: Date.now(),
      version: CACHE_VERSION,
      transactions,
      lastModified: new Date().toISOString()
    };
    sessionStorage.setItem(getCacheKey(), JSON.stringify(cacheData));
    logger.info("[DataContext] Cache updated:", {
      timestamp: cacheData.timestamp,
      transactionCount: transactions.length,
      lastModified: cacheData.lastModified
    });
  } catch (error) {
    logger.error("[DataContext] Error setting cache:", error);
    // Attempt to clear the cache if we can't set it
    try {
      sessionStorage.removeItem(getCacheKey());
    } catch (clearError) {
      logger.error("[DataContext] Error clearing cache:", clearError);
    }
  }
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Extract processing logic into a separate function
  const processTransactions = (transactions: any[]) => {
    try {
      logger.info("[DataContext] Processing transactions...");
      const loadedIncomes: Income[] = [];
      const loadedBills: Bill[] = [];
      const loadedCategories = new Map<number, Category>();

      transactions.forEach((t: any) => {
        const date = dayjs(t.date).isValid() ? dayjs(t.date).format('YYYY-MM-DD') : null;
        if (!date) {
          logger.warn(`[DataContext] Invalid date for transaction ID: ${t.id}, using today's date.`);
        }

        const finalDate = date || dayjs().format('YYYY-MM-DD');

        if (t.type === 'income') {
          const income = {
            id: t.id,
            source: t.description || 'Unknown Source',
            amount: parseFloat(t.amount) || 0,
            date: finalDate,
            occurrenceType: t.recurring_type || 'once',
            firstDate: t.first_date,
            secondDate: t.second_date
          };
          // Expand recurring incomes
          const expandedIncomes = expandRecurringIncome(income);
          loadedIncomes.push(...expandedIncomes);
        } else if (t.type === 'expense') {
          // If this transaction has a category, add it to our categories map
          if (t.category_id) {
            loadedCategories.set(t.category_id, {
              id: t.category_id,
              name: t.category_name || 'Uncategorized',
              color: t.category_color || '#808080',
              icon: t.category_icon || 'help-circle'
            });
          }

          loadedBills.push({
            id: t.id,
            name: t.description || 'Unknown Expense',
            amount: parseFloat(t.amount) || 0,
            date: finalDate,
            isOneTime: !t.recurring_id,
            day: dayjs(finalDate).date(),
            category_id: t.category_id || null,
            category_name: t.category_name || 'Uncategorized',
            category_color: t.category_color || '#808080',
            category_icon: t.category_icon || 'help-circle',
            category: t.category_id ? {
              name: t.category_name || 'Uncategorized',
              color: t.category_color || '#808080',
              icon: t.category_icon || 'help-circle'
            } : undefined
          });
        }
      });

      setIncomes(loadedIncomes);
      setBills(loadedBills);
      setCategories(Array.from(loadedCategories.values()));

      logger.info("[DataContext] Successfully processed transactions:", {
        incomesCount: loadedIncomes.length,
        billsCount: loadedBills.length,
        categoriesCount: loadedCategories.size
      });
    } catch (error) {
      logger.error("[DataContext] Error processing transactions:", error);
      throw error;
    }
  };

  // Improved cache management

  // Improved loadData function with proper caching
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check cache first
      const cachedData = getCache();
      if (cachedData) {
        logger.info("[DataContext] Loading transactions from cache...", {
          age: Date.now() - cachedData.timestamp
        });
        processTransactions(cachedData.transactions);
        setIsLoading(false);
        return;
      }

      logger.info("[DataContext] Fetching transactions from API...");
      const transactions = await fetchJsonWithErrorHandling('/api/transactions', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      // Update cache with new data
      setCache(transactions);

      // Process the transactions
      processTransactions(transactions);
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

      const newTransaction = await fetchJsonWithErrorHandling('/api/transactions', {
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
          secondDate: income.secondDate
        }),
      });

      logger.info("[DataContext] Successfully added income to database:", newTransaction);

      // Add to local state directly instead of reloading
      const expandedIncomes = expandRecurringIncome(income);
      setIncomes(prev => [...prev, ...expandedIncomes]);

      // Invalidate cache
      sessionStorage.removeItem(getCacheKey());
      logger.info("[DataContext] Cache invalidated after adding income");

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

      const newTransaction = await fetchJsonWithErrorHandling('/api/transactions', {
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

      const newBill = {
        ...bill,
        id: newTransaction.id
      };

      // Update local state directly
      setBills(prev => [...prev, newBill]);

      // Invalidate cache
      sessionStorage.removeItem(getCacheKey());
      logger.info("[DataContext] Cache invalidated after adding bill");

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add bill";
      logger.error("[DataContext] Error in addBill:", { error });
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

      // Store current state for potential rollback
      const previousIncomes = [...incomes];
      const previousBills = [...bills];

      // Optimistic update: Remove from state immediately
      if ('source' in transaction) {
        setIncomes(prev => prev.filter(inc => inc.id !== transaction.id));
      } else {
        setBills(prev => prev.filter(bill => bill.id !== transaction.id));
      }

      logger.info("[DataContext] Optimistically removed transaction from state:", {
        id: transaction.id,
        type: 'source' in transaction ? 'income' : 'bill'
      });

      const response = await fetch(`/api/transactions/${transaction.id}`, {
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

      // Just invalidate cache on success
      sessionStorage.removeItem(getCacheKey());
      logger.info("[DataContext] Cache invalidated after deleting transaction");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete transaction";
      logger.error("[DataContext] Error in deleteTransaction:", { error });

      // Revert optimistic update on error
      setIncomes(prev => 'source' in transaction ? previousIncomes : prev);
      setBills(prev => !('source' in transaction) ? previousBills : prev);

      setError(new Error(errorMessage));
      throw error;
    }
  };

  // Edit a transaction with optimistic updates
  const editTransaction = async (transaction: Income | Bill) => {
    try {
      setError(null);
      const isIncome = 'source' in transaction;
      const baseId = getBaseId(transaction.id);

      // Store current state for potential rollback
      const previousIncomes = [...incomes];
      const previousBills = [...bills];

      logger.info("[DataContext] Editing transaction:", {
        transaction,
        baseId,
        type: isIncome ? 'income' : 'expense'
      });

      // Optimistic update
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
          secondDate: isIncome ? (transaction as Income).secondDate : undefined,
          category_id: !isIncome ? (transaction as Bill).category_id : undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to edit transaction: ${response.status} ${response.statusText}${errorData.message ? ` - ${errorData.message}` : ''}`);
      }

      // Just invalidate cache on success
      sessionStorage.removeItem(getCacheKey());
      logger.info("[DataContext] Cache invalidated after editing transaction");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to edit transaction";
      logger.error("[DataContext] Error in editTransaction:", { error });

      // Revert optimistic update on error
      setIncomes(prev => isIncome ? previousIncomes : prev);
      setBills(prev => !isIncome ? previousBills : prev);

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
      categories,
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
  try {
    const context = useContext(DataContext);
    if (!context) {
      // Get the calling component name from the error stack
      const stack = new Error().stack;
      const callerComponent = stack
        ?.split('\n')[2] // Get the caller's line
        ?.match(/at\s+([^\s]+)\s+/)?.[1] // Extract component name
        || 'Unknown Component';

      const errorMessage = `[DataContext] useData() must be used within <DataProvider>. Called from: ${callerComponent}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    return context;
  } catch (error) {
    // Log the error with full stack trace
    logger.error('[DataContext] Error in useData():', {
      error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}