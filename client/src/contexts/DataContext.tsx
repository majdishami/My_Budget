import { createContext, useContext, useEffect, useState } from "react";
import { Income, Bill } from "@/types";
import { generateId } from "@/lib/utils";
import dayjs from "dayjs";
import { logger } from "@/lib/logger";
import { incomeSchema, billSchema } from "@/lib/validation";

interface DataContextType {
  incomes: Income[];
  bills: Bill[];
  saveIncomes: (newIncomes: Income[]) => Promise<void>;
  saveBills: (newBills: Bill[]) => Promise<void>;
  addIncome: (income: Income) => void;
  addBill: (bill: Bill) => void;
  deleteTransaction: (transaction: Income | Bill) => void;
  editTransaction: (transaction: Income | Bill) => void;
  resetData: () => Promise<void>;
  refresh: () => Promise<void>;
  addIncomeToData: (income: Income) => void;
  isLoading: boolean;
  error: Error | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const defaultIncomes: Income[] = [
  { 
    id: generateId(), 
    source: "Majdi's Salary", 
    amount: 4739, 
    date: dayjs('2025-02-01').toISOString(), // Set to start of current month
    occurrenceType: 'twice-monthly',
    firstDate: 1,
    secondDate: 15
  },
  { 
    id: generateId(), 
    source: "Ruba's Salary", 
    amount: 2168, 
    date: dayjs('2025-01-10').toISOString(), // Set to first occurrence
    occurrenceType: 'biweekly'
  }
];

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Batch storage operations with proper error handling
  const saveToStorage = async (key: string, data: any) => {
    try {
      setIsSaving(true);
      localStorage.setItem(key, JSON.stringify(data));
      logger.info(`Successfully saved ${key}`, { count: Array.isArray(data) ? data.length : 1 });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save data";
      logger.error(`Error saving ${key}:`, { error });
      throw new Error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Enhanced data validation using Zod schemas
  const validateData = <T extends Income | Bill>(
    data: T[],
    schema: typeof incomeSchema | typeof billSchema,
    type: string
  ): T[] => {
    try {
      if (!Array.isArray(data)) {
        throw new Error(`${type} data must be an array`);
      }

      const validatedData = data.map((item, index) => {
        const result = schema.safeParse(item);
        if (!result.success) {
          logger.error(`Invalid ${type} at index ${index}:`, { error: result.error });
          throw new Error(`Invalid ${type} at index ${index}: ${result.error.message}`);
        }
        return item;
      });

      return validatedData;
    } catch (error) {
      logger.error(`Validation error for ${type}:`, { error });
      throw error;
    }
  };

  // Initialize default data with proper validation
  const initializeDefaultData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const defaultBills: Bill[] = [
        { id: generateId(), name: "ATT Phone Bill ($115 Rund Roaming)", amount: 429, day: 1, category_id: 8, category_name: "Phone & Internet", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() },
        { id: generateId(), name: "Maid's 1st payment", amount: 120, day: 1, category_id: 11, category_name: "Home Services", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() },
        { id: generateId(), name: "Monthly Rent", amount: 3750, day: 1, category_id: 1, category_name: "Housing", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() },
        { id: generateId(), name: "Sling TV (CC 9550)", amount: 75, day: 3, category_id: 10, category_name: "Entertainment", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() },
        { id: generateId(), name: "Cox Internet", amount: 81, day: 6, category_id: 9, category_name: "Internet", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() },
        { id: generateId(), name: "Water Bill", amount: 80, day: 7, category_id: 7, category_name: "Utilities", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() },
        { id: generateId(), name: "NV Energy Electrical", amount: 250, day: 7, category_id: 5, category_name: "Electricity", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() },
        { id: generateId(), name: "TransAmerica Life Insurance", amount: 77, day: 9, category_id: 13, category_name: "Insurance", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() },
        { id: generateId(), name: "Credit Card minimum payments", amount: 225, day: 14, category_id: 14, category_name: "Credit Cards", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() },
        { id: generateId(), name: "Apple/Google/YouTube (CC 9550)", amount: 130, day: 14, category_id: 12, category_name: "Subscriptions", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() },
        { id: generateId(), name: "Expenses & Groceries", amount: 3000, day: 16, category_id: 4, category_name: "Groceries", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() },
        { id: generateId(), name: "Maid's 2nd Payment", amount: 120, day: 17, category_id: 11, category_name: "Home Services", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() },
        { id: generateId(), name: "SoFi Personal Loan", amount: 1915, day: 17, category_id: 2, category_name: "Loans", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() },
        { id: generateId(), name: "Southwest Gas", amount: 75, day: 17, category_id: 6, category_name: "Gas", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() },
        { id: generateId(), name: "Car Insurance (3 cars)", amount: 704, day: 28, category_id: 3, category_name: "Auto Insurance", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() }
      ];

      // Validate default data using Zod schemas
      const validatedIncomes = validateData(defaultIncomes, incomeSchema, "income");
      const validatedBills = validateData(defaultBills, billSchema, "bill");

      setIncomes(validatedIncomes);
      setBills(validatedBills);

      try {
        await Promise.all([
          saveToStorage("budgetIncomes", validatedIncomes),
          saveToStorage("budgetBills", validatedBills)
        ]);
        logger.info("Successfully initialized default data");
      } catch (storageError) {
        logger.error("Failed to save default data to localStorage", { error: storageError });
        throw new Error("Failed to save default data to storage");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to initialize data";
      logger.error("Error in initializeDefaultData:", { error });
      setError(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const generateIncomeOccurrences = (income: Income): Income[] => {
    const occurrences: Income[] = [];
    const currentDate = dayjs();
    const startOfMonth = currentDate.startOf('month');
    const endDate = currentDate.add(12, 'months').endOf('month');

    switch (income.occurrenceType) {
      case 'once':
        occurrences.push(income);
        break;

      case 'weekly':
        let weeklyDate = dayjs(income.date);
        while (weeklyDate.isBefore(endDate) || weeklyDate.isSame(endDate)) {
          occurrences.push({
            ...income,
            id: `${income.id}-${weeklyDate.format('YYYY-MM-DD')}`,
            date: weeklyDate.toISOString()
          });
          weeklyDate = weeklyDate.add(7, 'days');
        }
        break;

      case 'biweekly':
        let biweeklyDate = dayjs(income.date);
        while (biweeklyDate.isBefore(endDate) || biweeklyDate.isSame(endDate)) {
          if (biweeklyDate.isAfter(startOfMonth) || biweeklyDate.isSame(startOfMonth)) {
            occurrences.push({
              ...income,
              id: `${income.id}-${biweeklyDate.format('YYYY-MM-DD')}`,
              date: biweeklyDate.toISOString()
            });
          }
          biweeklyDate = biweeklyDate.add(14, 'days');
        }
        break;

      case 'monthly':
        let monthlyDate = dayjs(income.date);
        while (monthlyDate.isBefore(endDate) || monthlyDate.isSame(endDate)) {
          occurrences.push({
            ...income,
            id: `${income.id}-${monthlyDate.format('YYYY-MM-DD')}`,
            date: monthlyDate.toISOString()
          });
          monthlyDate = monthlyDate.add(1, 'month');
        }
        break;

      case 'twice-monthly':
        let currentMonth = startOfMonth;
        while (currentMonth.isBefore(endDate) || currentMonth.isSame(endDate)) {
          // First occurrence on the first date (default to 1st if not specified)
          if (income.firstDate) {
            const firstOccurrence = currentMonth.date(income.firstDate);
            if (firstOccurrence.isValid()) {
              occurrences.push({
                ...income,
                id: `${income.id}-1-${firstOccurrence.format('YYYY-MM-DD')}`,
                date: firstOccurrence.toISOString()
              });
            }
          }

          // Second occurrence on the second date (default to 15th if not specified)
          if (income.secondDate) {
            const secondOccurrence = currentMonth.date(income.secondDate);
            if (secondOccurrence.isValid()) {
              occurrences.push({
                ...income,
                id: `${income.id}-2-${secondOccurrence.format('YYYY-MM-DD')}`,
                date: secondOccurrence.toISOString()
              });
            }
          }

          currentMonth = currentMonth.add(1, 'month');
        }
        break;
    }

    return occurrences;
  };

  const getMonthlyIncomeOccurrences = () => {
    const allOccurrences: Income[] = [];
    incomes.forEach(income => {
      allOccurrences.push(...generateIncomeOccurrences(income));
    });
    return allOccurrences.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const loadFromStorage = async <T extends Income | Bill>(
        key: string,
        validator: (item: any) => boolean,
        type: string
      ): Promise<T[]> => {
        const data = localStorage.getItem(key);
        if (!data) return [];
        try {
          const parsed = JSON.parse(data);
          return validateData(parsed, validator, type);
        } catch (error) {
          logger.warn(`Invalid stored ${type}, initializing defaults`, { error });
          return [];
        }
      };

      const [storedIncomes, storedBills] = await Promise.all([
        loadFromStorage<Income>("budgetIncomes", isValidIncome, "income"),
        loadFromStorage<Bill>("budgetBills", isValidBill, "bill")
      ]);

      if (!storedIncomes.length && !storedBills.length) {
        await initializeDefaultData();
      } else {
        setIncomes(storedIncomes);
        setBills(storedBills);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load data";
      logger.error("Error loading data:", { error });
      setError(new Error(errorMessage));
      await initializeDefaultData();
    } finally {
      setIsLoading(false);
    }
  };

  // Effect cleanup and initialization
  useEffect(() => {
    const controller = new AbortController();
    loadData();
    return () => {
      controller.abort();
    };
  }, []);

  const addIncomeToData = (income: Income) => {
    try {
      setError(null);
      const validatedIncome = incomeSchema.safeParse(income);
      if (!validatedIncome.success) {
        throw new Error(`Invalid income data: ${validatedIncome.error.message}`);
      }
      const newIncomes = [...incomes, income];
      setIncomes(newIncomes);
      saveToStorage("budgetIncomes", newIncomes);
      logger.info("Successfully added income", { income });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add income";
      logger.error("Error in addIncome:", { error });
      setError(new Error(errorMessage));
      throw error;
    }
  };

  const addBill = (bill: Bill) => {
    try {
      setError(null);
      const validatedBill = billSchema.safeParse(bill);
      if (!validatedBill.success) {
        throw new Error(`Invalid bill data: ${validatedBill.error.message}`);
      }
      const newBills = [...bills, bill];
      setBills(newBills);
      saveToStorage("budgetBills", newBills);
      logger.info("Successfully added bill", { bill });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add bill";
      logger.error("Error in addBill:", { error });
      setError(new Error(errorMessage));
      throw error;
    }
  };

  const isValidIncome = (income: any): income is Income => {
    return incomeSchema.safeParse(income).success;
  };

  const isValidBill = (bill: any): bill is Bill => {
    return billSchema.safeParse(bill).success;
  };


  return (
    <DataContext.Provider value={{
      incomes: getMonthlyIncomeOccurrences(),
      bills,
      saveIncomes: async (newIncomes) => {
        try {
          setError(null);
          const validatedIncomes = validateData(newIncomes, incomeSchema, "income");
          setIncomes(validatedIncomes);
          await saveToStorage("budgetIncomes", validatedIncomes);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to save incomes";
          logger.error("Error in saveIncomes:", { error });
          setError(new Error(errorMessage));
          throw error;
        }
      },
      saveBills: async (newBills) => {
        try {
          setError(null);
          const validatedBills = validateData(newBills, billSchema, "bill");
          setBills(validatedBills);
          await saveToStorage("budgetBills", validatedBills);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to save bills";
          logger.error("Error in saveBills:", { error });
          setError(new Error(errorMessage));
          throw error;
        }
      },
      addIncome: addIncomeToData,
      addBill,
      deleteTransaction: (transaction: Income | Bill) => {
        try {
          setError(null);
          if ('source' in transaction) {
            // It's an income
            let newIncomes: Income[];
            if (transaction.occurrenceType !== 'once') {
              // For recurring incomes, remove all occurrences with the same source
              newIncomes = incomes.filter(i => i.source !== transaction.source);
            } else {
              // For one-time incomes, remove by ID
              newIncomes = incomes.filter(i => i.id !== transaction.id);
            }
            setIncomes(newIncomes);
            saveToStorage("budgetIncomes", newIncomes);
            logger.info("Successfully deleted income", { income: transaction });
          } else {
            // It's a bill
            const newBills = bills.filter(b => b.id !== transaction.id);
            setBills(newBills);
            saveToStorage("budgetBills", newBills);
            logger.info("Successfully deleted bill", { bill: transaction });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to delete transaction";
          logger.error("Error in deleteTransaction:", { error });
          setError(new Error(errorMessage));
          throw error;
        }
      },
      editTransaction: (transaction: Income | Bill) => {
        try {
          setError(null);
          if ('source' in transaction) {
            // It's an income
            const validatedIncome = incomeSchema.safeParse(transaction);
            if (!validatedIncome.success) {
              throw new Error(`Invalid income data: ${validatedIncome.error.message}`);
            }
            const newIncomes = incomes.map(i => i.id === transaction.id ? transaction : i);
            setIncomes(newIncomes);
            saveToStorage("budgetIncomes", newIncomes);
            logger.info("Successfully edited income", { income: transaction });
          } else {
            // It's a bill
            const validatedBill = billSchema.safeParse(transaction);
            if (!validatedBill.success) {
              throw new Error(`Invalid bill data: ${validatedBill.error.message}`);
            }
            const newBills = bills.map(b => b.id === transaction.id ? transaction : b);
            setBills(newBills);
            saveToStorage("budgetBills", newBills);
            logger.info("Successfully edited bill", { bill: transaction });
          }
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
          localStorage.removeItem("budgetIncomes");
          localStorage.removeItem("budgetBills");
          logger.info("Successfully cleared data");
          await initializeDefaultData();
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