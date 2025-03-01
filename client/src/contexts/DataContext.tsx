import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useLocation } from "wouter";
import { Income, Bill, Transaction, Category } from "@/types";
import dayjs from "dayjs";
import logger from "@/lib/logger";

interface DataContextType {
  isLoading: boolean;
  categories: Category[];
  incomes: Income[];
  bills: Bill[];
  transactions: Transaction[];
  fetchCategories: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  addIncome: (income: Omit<Income, 'id'>) => Promise<void>;
  updateIncome: (income: Income) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  addBill: (bill: Omit<Bill, 'id'>) => Promise<void>;
  updateBill: (bill: Bill) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  saveIncomes: (newIncomes: Income[]) => Promise<void>;
  saveBills: (newBills: Bill[]) => Promise<void>;
  addIncomeToData: (income: Income) => Promise<void>;
  resetData: () => Promise<void>;
  refresh: () => Promise<void>;
  error: Error | null;
}

interface CacheData {
  timestamp: number;
  version: number;
  transactions: any[];
  lastModified?: string;
}

const CACHE_VERSION = 1;
const CACHE_MAX_AGE = 5 * 60 * 1000;

const DataContext = createContext<DataContextType | undefined>(undefined);

const generateInstanceId = (baseId: number, index: number): number => {
  if (typeof baseId !== 'number' || isNaN(baseId)) {
    throw new Error('Invalid base ID: must be a number');
  }
  return baseId * 100 + (index + 1);
};

const getBaseId = (instanceId: number): number => {
  if (typeof instanceId !== 'number' || isNaN(instanceId)) {
    throw new Error('Invalid instance ID: must be a number');
  }
  return Math.floor(instanceId / 100);
};

const expandRecurringIncome = (baseIncome: Income, months: number = 12) => {
  const incomes: Income[] = [];
  if (!baseIncome.date || !dayjs(baseIncome.date).isValid()) {
    logger.error("[DataContext] Invalid date in income:", { income: baseIncome });
    throw new Error('Invalid date format in income');
  }
  if (baseIncome.occurrenceType === 'once') {
    return [baseIncome];
  }
  const baseDate = dayjs(baseIncome.date);
  const startDate = baseDate.startOf('month');
  const endDate = startDate.add(months, 'months');
  logger.info("[DataContext] Expanding recurring income:", {
    baseId: baseIncome.id,
    occurrenceType: baseIncome.occurrenceType,
    baseDate: baseDate.format('YYYY-MM-DD'),
    startDate: startDate.format('YYYY-MM-DD'),
    endDate: endDate.format('YYYY-MM-DD')
  });
  let currentDate = startDate;
  while (currentDate.isBefore(endDate)) {
    switch (baseIncome.occurrenceType) {
      case 'monthly':
        let monthlyDate = currentDate.date(baseDate.date());
        if (monthlyDate.month() !== currentDate.month()) {
          monthlyDate = currentDate.endOf('month');
        }
        incomes.push({
          ...baseIncome,
          id: generateInstanceId(baseIncome.id, incomes.length),
          date: monthlyDate.format('YYYY-MM-DD'),
          occurrenceType: 'monthly'
        });
        currentDate = currentDate.add(1, 'month');
        break;
      case 'twice-monthly':
        const firstDate = baseIncome.firstDate || 1;
        const secondDate = baseIncome.secondDate || 15;
        incomes.push({
          ...baseIncome,
          id: generateInstanceId(baseIncome.id, incomes.length),
          date: currentDate.date(firstDate).format('YYYY-MM-DD'),
          occurrenceType: 'twice-monthly'
        });
        incomes.push({
          ...baseIncome,
          id: generateInstanceId(baseIncome.id, incomes.length),
          date: currentDate.date(secondDate).format('YYYY-MM-DD'),
          occurrenceType: 'twice-monthly'
        });
        currentDate = currentDate.add(1, 'month');
        break;
      case 'biweekly':
        let biweekDate = currentDate;
        if (baseIncome.source === "Ruba's Salary") {
          while (biweekDate.day() !== 5) {
            biweekDate = biweekDate.add(1, 'day');
          }
        }
        while (biweekDate.isBefore(currentDate.add(1, 'month'))) {
          incomes.push({
            ...baseIncome,
            id: generateInstanceId(baseIncome.id, incomes.length),
            date: biweekDate.format('YYYY-MM-DD'),
            occurrenceType: 'biweekly'
          });
          biweekDate = biweekDate.add(14, 'days');
        }
        currentDate = currentDate.add(1, 'month');
        break;
      case 'weekly':
        let weekDate = currentDate;
        while (weekDate.isBefore(currentDate.add(1, 'month'))) {
          incomes.push({
            ...baseIncome,
            id: generateInstanceId(baseIncome.id, incomes.length),
            date: weekDate.format('YYYY-MM-DD'),
            occurrenceType: 'weekly'
          });
          weekDate = weekDate.add(1, 'week');
        }
        currentDate = currentDate.add(1, 'month');
        break;
    }
  }
  logger.info("[DataContext] Generated income instances:", {
    count: incomes.length,
    dates: incomes.map(inc => inc.date)
  });
  return incomes;
};

const filterBillsForCalendar = (bills: Bill[]) => {
  const uniqueBills = new Map<string, Bill>();
  bills.forEach(bill => {
    const billDate = dayjs(bill.date);
    const billKey = `${bill.name}-${billDate.date()}`;
    if (!uniqueBills.has(billKey)) {
      uniqueBills.set(billKey, bill);
    }
  });
  return Array.from(uniqueBills.values());
};

const expandRecurringBill = (baseBill: Bill) => {
  const bills: Bill[] = [];
  if (!baseBill.date || !dayjs(baseBill.date).isValid()) {
    logger.error("[DataContext] Invalid date in bill:", { bill: baseBill });
    throw new Error('Invalid date format in bill');
  }
  const startDate = dayjs('2025-01-01');
  const endDate = dayjs().add(12, 'months').endOf('month');
  const baseDate = dayjs(baseBill.date);
  let currentDate = startDate.date(baseDate.date());
  while (currentDate.isBefore(endDate)) {
    const monthDiff = currentDate.diff(baseDate, 'month');
    const instanceId = generateInstanceId(baseBill.id, monthDiff);
    bills.push({
      ...baseBill,
      id: instanceId,
      date: currentDate.format('YYYY-MM-DD'),
      recurring_type: 'monthly'
    });
    currentDate = currentDate.add(1, 'month');
    if (baseDate.date() > currentDate.daysInMonth()) {
      currentDate = currentDate.endOf('month');
    }
  }
  if (window.location.pathname === '/') {
    return filterBillsForCalendar(bills);
  }
  return bills;
};

const fetchJsonWithErrorHandling = async (url: string, options: RequestInit = {}, baseUrl: string = '/api') => {
  try {
    const response = await fetch(baseUrl + url, options);
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
          errorData && 'message' in errorData ? errorData.message :
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
      if (!cacheData.timestamp || !Array.isArray(cacheData.transactions)) {
        throw new Error('Invalid cache structure');
      }
    } catch (parseError) {
      logger.error("[DataContext] Cache data is malformed:", { parseError });
      sessionStorage.removeItem(getCacheKey());
      return null;
    }
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
    logger.error("[DataContext] Error reading cache:", { error: String(error) });
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
    logger.error("[DataContext] Error setting cache:", { error: String(error) });
    try {
      sessionStorage.removeItem(getCacheKey());
    } catch (clearError) {
      logger.error("[DataContext] Error clearing cache:", { error: String(clearError) });
    }
  }
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  console.log('[DataContext] Provider initializing');
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]); // Added transactions state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const processTransactions = (transactions: any[]) => {
    try {
      logger.info("[DataContext] Processing transactions...");
      const loadedIncomes: Income[] = [];
      const loadedBills: Bill[] = [];
      const loadedCategories = new Map<number, Category>();
      const processedSources = new Set<string>();
      transactions.forEach((t: any) => {
        if (t.type === 'income' && (!t.is_recurring || t.recurring_type === 'once')) {
          const income = {
            id: t.id,
            source: t.description || 'Unknown Source',
            amount: parseFloat(t.amount) || 0,
            date: dayjs(t.date).isValid() ? dayjs(t.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
            occurrenceType: 'once',
            is_recurring: false
          };
          loadedIncomes.push(income as unknown as Income);
          processedSources.add(income.source);
        }
      });
      transactions.forEach((t: any) => {
        if (t.type === 'income' && t.is_recurring && t.recurring_type !== 'once' && !processedSources.has(t.description)) {
          const income = {
            id: t.id,
            source: t.description || 'Unknown Source',
            amount: parseFloat(t.amount) || 0,
            date: dayjs(t.date).isValid() ? dayjs(t.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
            occurrenceType: t.recurring_type,
            firstDate: t.first_date,
            secondDate: t.second_date,
            is_recurring: true
          };
          const expandedIncomes = expandRecurringIncome(income);
          loadedIncomes.push(...expandedIncomes);
          processedSources.add(income.source);
        }
      });
      transactions.forEach((t: any) => {
        if (t.type === 'expense') {
          if (t.category_id) {
            loadedCategories.set(t.category_id, {
              id: t.category_id,
              name: t.category_name || 'Uncategorized',
              color: t.category_color || '#808080',
              icon: t.category_icon || 'help-circle'
            });
          }
          const bill = {
            id: t.id,
            name: t.description || 'Unknown Expense',
            amount: parseFloat(t.amount) || 0,
            date: dayjs(t.date).isValid() ? dayjs(t.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
            isOneTime: !t.recurring_id,
            isYearly: t.is_yearly || false,
            yearly_date: t.yearly_date,
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
          };
          const expandedBills = expandRecurringBill(bill);
          const billsToAdd = window.location.pathname === '/' ? filterBillsForCalendar(expandedBills) : expandedBills;
          loadedBills.push(...billsToAdd);
        }
      });
      const sortedIncomes = loadedIncomes.sort((a, b) =>
        dayjs(a.date).valueOf() - dayjs(b.date).valueOf()
      );
      const monthlyTotals = new Map<string, number>();
      sortedIncomes.forEach(income => {
        const monthKey = dayjs(income.date).format('YYYY-MM');
        const currentTotal = monthlyTotals.get(monthKey) || 0;
        monthlyTotals.set(monthKey, currentTotal + income.amount);
      });
      logger.info("[DataContext] Monthly income totals:", {
        totals: Object.fromEntries(monthlyTotals),
        totalIncomes: sortedIncomes.length,
        uniqueSources: Array.from(processedSources)
      });
      setIncomes(sortedIncomes);
      setBills(loadedBills);
      setCategories(Array.from(loadedCategories.values()));
      logger.info("[DataContext] Successfully processed transactions:", {
        incomesCount: sortedIncomes.length,
        billsCount: loadedBills.length,
        categoriesCount: loadedCategories.size,
      });
    } catch (error) {
      logger.error("[DataContext] Error processing transactions:", { error: String(error) });
      throw error;
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await checkHealth();
      await Promise.all([
        fetchCategories(),
        fetchTransactions()
      ]);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data. Please try again later.");
      setIsLoading(false);
      return false;
    }
  };

  const addIncome = async (income: Omit<Income, 'id'>) => {
    try {
      setError(null);
      logger.info("[DataContext] Adding income:", { income });
      const payload = {
        description: income.source,
        amount: income.amount,
        date: dayjs(income.date).format('YYYY-MM-DD'),
        type: 'income',
        recurring_type: income.occurrenceType,
        first_date: income.firstDate,
        second_date: income.secondDate,
        is_recurring: income.occurrenceType !== 'once'
      };
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to create income');
      }
      sessionStorage.removeItem(getCacheKey());
      await loadData();
      logger.info("[DataContext] Successfully added income, forcing refresh");
      console.log('Income added successfully');
    } catch (error: any) {
      logger.error("[DataContext] Error in addIncome:", error);
      setError(error.message);
      console.error('Error adding income:', error.message);
      throw error;
    }
  };

  const addBill = async (bill: Omit<Bill, 'id'>) => {
    try {
      setError(null);
      logger.info("[DataContext] Adding bill:", { bill });
      const newTransaction = await fetchJsonWithErrorHandling('/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: bill.name,
          amount: bill.amount,
          date: dayjs(bill.date).format('YYYY-MM-DD'),
          type: 'expense',
          category_id: bill.category_id,
          is_yearly: bill.isYearly,
          yearly_date: bill.yearly_date
        }),
      });
      const newBill = {
        ...bill,
        id: newTransaction.id
      };
      setBills(prev => [...prev, newBill]);
      sessionStorage.removeItem(getCacheKey());
      logger.info("[DataContext] Cache invalidated after adding bill");
      console.log('Bill added successfully');
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add bill";
      logger.error("[DataContext] Error in addBill:", { error });
      setError(new Error(errorMessage));
      console.error('Error adding bill:', error.message);
      throw error;
    }
  };

  const deleteTransaction = async (transaction: Income | Bill) => {
    const isIncome = 'source' in transaction;
    const previousIncomes = [...incomes];
    const previousBills = [...bills];
    try {
      setError(null);
      logger.info("[DataContext] Starting deletion of transaction:", transaction);
      if (!transaction || typeof transaction.id !== 'number') {
        logger.error("[DataContext] Invalid transaction ID:", { id: transaction?.id, type: typeof transaction?.id });
        throw new Error('Invalid transaction: Transaction object is required with a numeric ID');
      }
      const baseId = getBaseId(transaction.id);
      logger.info("[DataContext] Calculated base ID for deletion:", {
        originalId: transaction.id,
        baseId: baseId
      });
      if (isIncome) {
        setIncomes(prev => prev.filter(inc => getBaseId(inc.id) !== baseId));
      } else {
        setBills(prev => prev.filter(bill => getBaseId(bill.id) !== baseId));
      }
      logger.info("[DataContext] Optimistically removed transaction from state:", {
        id: baseId,
        type: isIncome ? 'income' : 'bill'
      });
      const response = await fetch(`/api/transactions/${baseId}`, {
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
      sessionStorage.removeItem(getCacheKey());
      logger.info("[DataContext] Cache invalidated after deleting transaction");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete transaction";
      logger.error("[DataContext] Error in deleteTransaction:", { error });
      if (isIncome) {
        setIncomes(previousIncomes);
      } else {
        setBills(previousBills);
      }
      logger.info("[DataContext] Successfully rolled back state after delete failure");
      setError(new Error(errorMessage));
      throw error;
    }
  };

  const editTransaction = async (transaction: Income | Bill) => {
    try {
      setError(null);
      const isIncome = 'source' in transaction;
      const baseId = getBaseId(transaction.id);
      const previousIncomes = [...incomes];
      const previousBills = [...bills];
      logger.info("[DataContext] Editing transaction:", {
        transaction,
        baseId,
        type: isIncome ? 'income' : 'expense'
      });
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
          category_id: !isIncome ? (transaction as Bill).category_id : undefined,
          is_yearly: !isIncome ? (transaction as Bill).isYearly : undefined,
          yearly_date: !isIncome ? (transaction as Bill).yearly_date : undefined
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to edit transaction: ${response.status} ${response.statusText}${errorData.message ? ` - ${errorData.message}` : ''}`);
      }
      sessionStorage.removeItem(getCacheKey());
      logger.info("[DataContext] Cache invalidated after editing transaction");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to edit transaction";
      logger.error("[DataContext] Error in editTransaction:", { error });
      const isIncome = true;
      setIncomes(prev => isIncome ? previousIncomes : prev);
      setBills(prev => !isIncome ? previousBills : prev);
      setError(new Error(errorMessage));
      throw error;
    }
  };

  const addIncomeToData = async (income: Income) => {
    try {
      logger.info("[DataContext] Adding new income to database:", { income });
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
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to create income');
      }
      const newTransaction = await response.json();
      logger.info("[DataContext] Server response:", { newTransaction });
      const newIncome: Income = {
        ...income,
        id: newTransaction.id
      };
      if (income.occurrenceType !== 'once') {
        const expandedIncomes = expandRecurringIncome(newIncome);
        logger.info("[DataContext] Generated expanded incomes:", {
          count: expandedIncomes.length,
          firstDate: expandedIncomes[0]?.date,
          lastDate: expandedIncomes[expandedIncomes.length - 1]?.date
        });
        setIncomes(prev => {
          const filtered = prev.filter(i => i.source !== newIncome.source);
          return [...filtered, ...expandedIncomes];
        });
      } else {
        setIncomes(prev => [...prev, newIncome]);
      }
      sessionStorage.removeItem(getCacheKey());
      await loadData();
    } catch (error: any) {
      logger.error("[DataContext] Error in addIncomeToData:", error);
      console.error("Error adding income to data:", error);
      throw error;
    }
  };

  const saveIncomes = async (newIncomes: Income[]) => {
    await Promise.all(newIncomes.map(income => addIncome(income)));
  };

  const saveBills = async (newBills: Bill[]) => {
    await Promise.all(newBills.map(bill => addBill(bill)));
  };

  const checkHealth = async () => {
    const response = await fetch('/api/health');
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
    }
    console.log("Health check successful");
  };

  const fetchCategories = async () => {
    const categories = await fetchJsonWithErrorHandling('/categories');
    setCategories(categories);
  };

  const fetchTransactions = async () => {
    const transactions = await fetchJsonWithErrorHandling('/transactions', {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    processTransactions(transactions);
    setTransactions(transactions); //Update transactions state
  };

  useEffect(() => {
    loadData().catch(err => {
      console.error("Failed to fetch initial data:", err);
      setIsLoading(false);
    });
  }, [loadData]);

  const updateIncome = async (income: Income) => {
    //Implementation for updateIncome
    console.log("updateIncome function needs implementation");
  }

  const deleteIncome = async (id: string) => {
    //Implementation for deleteIncome
    console.log("deleteIncome function needs implementation");
  }

  const updateBill = async (bill: Bill) => {
    //Implementation for updateBill
    console.log("updateBill function needs implementation");
  }

  const deleteBill = async (id: string) => {
    //Implementation for deleteBill
    console.log("deleteBill function needs implementation");
  }

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    //Implementation for addTransaction
    console.log("addTransaction function needs implementation");
  }

  const updateTransaction = async (transaction: Transaction) => {
    //Implementation for updateTransaction
    console.log("updateTransaction function needs implementation");
  }

  const deleteTransactionById = async (id: string) => {
      //Implementation for deleteTransactionById
      console.log("deleteTransactionById function needs implementation");
  }


  return (
    <DataContext.Provider value={{
      isLoading,
      categories,
      incomes,
      bills,
      transactions,
      fetchCategories,
      fetchTransactions,
      addIncome,
      updateIncome,
      deleteIncome,
      addBill,
      updateBill,
      deleteBill,
      addTransaction,
      updateTransaction,
      deleteTransaction: deleteTransactionById,
      saveIncomes,
      saveBills,
      addIncomeToData,
      resetData: loadData,
      refresh: loadData,
      error
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};