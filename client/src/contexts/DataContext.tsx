import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Income, Bill } from "@/types";
import { generateId } from "@/lib/utils";
import dayjs from "dayjs";
import { logger } from "@/lib/logger";
import { incomeSchema, billSchema } from "@/lib/validation";

export interface DataContextType {
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

export const DataContext = createContext<DataContextType | null>(null);

interface DataProviderProps {
  children: ReactNode;
}

const defaultIncomes: Income[] = [
  {
    id: generateId(),
    source: "Majdi's Salary",
    amount: 4739,
    date: dayjs().startOf('month').toISOString(),
    occurrenceType: 'twice-monthly',
    firstDate: 1,
    secondDate: 15
  },
  {
    id: generateId(),
    source: "Ruba's Salary",
    amount: 2168,
    date: dayjs().startOf('month').add(9, 'days').toISOString(),
    occurrenceType: 'biweekly'
  }
];

export function DataProvider({ children }: DataProviderProps) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const saveToStorage = async (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      logger.info(`Successfully saved ${key}`, { count: Array.isArray(data) ? data.length : 1 });
    } catch (error) {
      logger.error(`Error saving ${key}:`, { error });
      throw error;
    }
  };

  const validateData = <T extends Income | Bill>(
    data: T[],
    schema: typeof incomeSchema | typeof billSchema,
    type: string
  ): T[] => {
    try {
      if (!Array.isArray(data)) {
        throw new Error(`${type} data must be an array`);
      }

      return data.map((item, index) => {
        const result = schema.safeParse(item);
        if (!result.success) {
          logger.error(`Invalid ${type} at index ${index}:`, { error: result.error });
          throw new Error(`Invalid ${type} at index ${index}`);
        }
        return item;
      });
    } catch (error) {
      logger.error(`Validation error for ${type}:`, { error });
      throw error;
    }
  };

  const initializeDefaultData = async () => {
    try {
      const defaultBills: Bill[] = [
        { id: generateId(), name: "ATT Phone Bill ($115 Rund Roaming)", amount: 429, day: 1, category_id: 8, category_name: "Phone & Internet", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() },
        { id: generateId(), name: "Monthly Rent", amount: 3750, day: 1, category_id: 1, category_name: "Housing", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() },
        { id: generateId(), name: "Cox Internet", amount: 81, day: 6, category_id: 9, category_name: "Internet", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() },
        { id: generateId(), name: "NV Energy Electrical", amount: 250, day: 7, category_id: 5, category_name: "Electricity", isOneTime: false, user_id: 1, created_at: dayjs().toISOString() }
      ];

      const validatedIncomes = validateData(defaultIncomes, incomeSchema, "income");
      const validatedBills = validateData(defaultBills, billSchema, "bill");

      setIncomes(validatedIncomes);
      setBills(validatedBills);

      await Promise.all([
        saveToStorage("budgetIncomes", validatedIncomes),
        saveToStorage("budgetBills", validatedBills)
      ]);

    } catch (error) {
      logger.error("Error in initializeDefaultData:", { error });
      throw error;
    }
  };

  const generateIncomeOccurrences = (income: Income): Income[] => {
    try {
      const occurrences: Income[] = [];
      const currentDate = dayjs();
      const startOfMonth = currentDate.startOf('month');
      const endDate = currentDate.add(2, 'months');

      switch (income.occurrenceType) {
        case 'once':
          return [income];

        case 'weekly':
          let weeklyDate = dayjs(income.date);
          while (weeklyDate.isBefore(endDate)) {
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
          while (biweeklyDate.isBefore(endDate)) {
            occurrences.push({
              ...income,
              id: `${income.id}-${biweeklyDate.format('YYYY-MM-DD')}`,
              date: biweeklyDate.toISOString()
            });
            biweeklyDate = biweeklyDate.add(14, 'days');
          }
          break;

        case 'twice-monthly':
          let currentMonth = startOfMonth;
          while (currentMonth.isBefore(endDate)) {
            if (income.firstDate) {
              occurrences.push({
                ...income,
                id: `${income.id}-1-${currentMonth.format('YYYY-MM')}`,
                date: currentMonth.date(income.firstDate).toISOString()
              });
            }
            if (income.secondDate) {
              occurrences.push({
                ...income,
                id: `${income.id}-2-${currentMonth.format('YYYY-MM')}`,
                date: currentMonth.date(income.secondDate).toISOString()
              });
            }
            currentMonth = currentMonth.add(1, 'month');
          }
          break;

        case 'monthly':
          let monthlyDate = dayjs(income.date);
          while (monthlyDate.isBefore(endDate)) {
            occurrences.push({
              ...income,
              id: `${income.id}-${monthlyDate.format('YYYY-MM')}`,
              date: monthlyDate.toISOString()
            });
            monthlyDate = monthlyDate.add(1, 'month');
          }
          break;
      }

      return occurrences;
    } catch (error) {
      logger.error('Error generating income occurrences:', { error, income });
      return [income];
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const loadFromStorage = async <T extends Income | Bill>(
        key: string,
        schema: typeof incomeSchema | typeof billSchema,
        type: string
      ): Promise<T[]> => {
        const data = localStorage.getItem(key);
        if (!data) return [];

        try {
          const parsed = JSON.parse(data);
          return validateData(parsed, schema, type);
        } catch (error) {
          logger.warn(`Invalid stored ${type}`, { error });
          return [];
        }
      };

      const [storedIncomes, storedBills] = await Promise.all([
        loadFromStorage<Income>("budgetIncomes", incomeSchema, "income"),
        loadFromStorage<Bill>("budgetBills", billSchema, "bill")
      ]);

      if (!storedIncomes.length && !storedBills.length) {
        await initializeDefaultData();
      } else {
        setIncomes(storedIncomes);
        setBills(storedBills);
      }

    } catch (error) {
      logger.error("Error loading data:", { error });
      setError(error instanceof Error ? error : new Error('Failed to load data'));
      await initializeDefaultData();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addIncomeToData = (income: Income) => {
    try {
      const validatedIncome = incomeSchema.safeParse(income);
      if (!validatedIncome.success) {
        throw new Error(`Invalid income data: ${validatedIncome.error.message}`);
      }
      const newIncomes = [...incomes, income];
      setIncomes(newIncomes);
      saveToStorage("budgetIncomes", newIncomes);
    } catch (error) {
      logger.error("Error in addIncome:", { error });
      throw error;
    }
  };

  const addBill = (bill: Bill) => {
    try {
      const validatedBill = billSchema.safeParse(bill);
      if (!validatedBill.success) {
        throw new Error(`Invalid bill data: ${validatedBill.error.message}`);
      }
      const newBills = [...bills, bill];
      setBills(newBills);
      saveToStorage("budgetBills", newBills);
    } catch (error) {
      logger.error("Error in addBill:", { error });
      throw error;
    }
  };

  const deleteTransaction = (transaction: Income | Bill) => {
    try {
      if ('source' in transaction) {
        const newIncomes = incomes.filter(i => i.id !== transaction.id);
        setIncomes(newIncomes);
        saveToStorage("budgetIncomes", newIncomes);
      } else {
        const newBills = bills.filter(b => b.id !== transaction.id);
        setBills(newBills);
        saveToStorage("budgetBills", newBills);
      }
    } catch (error) {
      logger.error("Error in deleteTransaction:", { error });
      throw error;
    }
  };

  const editTransaction = (transaction: Income | Bill) => {
    try {
      if ('source' in transaction) {
        const validatedIncome = incomeSchema.safeParse(transaction);
        if (!validatedIncome.success) {
          throw new Error(`Invalid income data: ${validatedIncome.error.message}`);
        }
        const newIncomes = incomes.map(i => i.id === transaction.id ? transaction : i);
        setIncomes(newIncomes);
        saveToStorage("budgetIncomes", newIncomes);
      } else {
        const validatedBill = billSchema.safeParse(transaction);
        if (!validatedBill.success) {
          throw new Error(`Invalid bill data: ${validatedBill.error.message}`);
        }
        const newBills = bills.map(b => b.id === transaction.id ? transaction : b);
        setBills(newBills);
        saveToStorage("budgetBills", newBills);
      }
    } catch (error) {
      logger.error("Error in editTransaction:", { error });
      throw error;
    }
  };

  const resetData = async () => {
    try {
      localStorage.removeItem("budgetIncomes");
      localStorage.removeItem("budgetBills");
      await initializeDefaultData();
    } catch (error) {
      logger.error("Error in resetData:", { error });
      throw error;
    }
  };

  const getMonthlyIncomeOccurrences = () => {
    try {
      const allOccurrences: Income[] = [];
      incomes.forEach(income => {
        const occurrences = generateIncomeOccurrences(income);
        allOccurrences.push(...occurrences);
      });
      return allOccurrences.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
    } catch (error) {
      logger.error("Error in getMonthlyIncomeOccurrences:", { error });
      return incomes;
    }
  };

  const contextValue: DataContextType = {
    incomes: getMonthlyIncomeOccurrences(),
    bills,
    saveIncomes: async (newIncomes: Income[]) => {
      const validatedIncomes = validateData(newIncomes, incomeSchema, "income");
      setIncomes(validatedIncomes);
      await saveToStorage("budgetIncomes", validatedIncomes);
    },
    saveBills: async (newBills: Bill[]) => {
      const validatedBills = validateData(newBills, billSchema, "bill");
      setBills(validatedBills);
      await saveToStorage("budgetBills", validatedBills);
    },
    addIncome: addIncomeToData,
    addBill,
    deleteTransaction,
    editTransaction,
    resetData,
    refresh: loadData,
    addIncomeToData,
    isLoading,
    error
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading budget data...</div>;
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        Error: {error.message}
      </div>
    );
  }

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}