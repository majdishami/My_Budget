import { createContext, useContext, useEffect, useState } from "react";
import { Income, Bill } from "@/types";
import { generateId } from "@/lib/utils";
import dayjs from "dayjs";
import { logger } from "@/lib/logger";

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

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isValidIncome = (income: any): income is Income => {
    if (typeof income !== 'object' || income === null) {
      throw new Error('Income must be an object');
    }
    if (typeof income.id !== 'string' || !income.id) {
      throw new Error('Income ID must be a non-empty string');
    }
    if (typeof income.source !== 'string' || income.source.trim() === '') {
      throw new Error('Income source must be a non-empty string');
    }
    if (typeof income.amount !== 'number' || isNaN(income.amount)) {
      throw new Error('Income amount must be a valid number');
    }
    if (typeof income.date !== 'string' || isNaN(new Date(income.date).getTime())) {
      throw new Error('Income date must be a valid date string');
    }
    if (typeof income.occurrenceType !== 'string' || !['once', 'monthly', 'biweekly', 'twice-monthly'].includes(income.occurrenceType)) {
      throw new Error('Income occurrenceType must be one of: once, monthly, biweekly, twice-monthly');
    }
    return true;
  };

  const isValidBill = (bill: any): bill is Bill => {
    if (typeof bill !== 'object' || bill === null) {
      throw new Error('Bill must be an object');
    }
    if (typeof bill.id !== 'string' || !bill.id) {
      throw new Error('Bill ID must be a non-empty string');
    }
    if (typeof bill.name !== 'string' || bill.name.trim() === '') {
      throw new Error('Bill name must be a non-empty string');
    }
    if (typeof bill.amount !== 'number' || isNaN(bill.amount)) {
      throw new Error('Bill amount must be a valid number');
    }
    if (typeof bill.day !== 'number' || bill.day < 1 || bill.day > 31) {
      throw new Error('Bill day must be between 1 and 31');
    }
    if (typeof bill.category_id !== 'number') {
      throw new Error('Bill category_id must be a number');
    }
    if (typeof bill.category_name !== 'string') {
      throw new Error('Bill category_name must be a string');
    }
    if (typeof bill.user_id !== 'number') {
      throw new Error('Bill user_id must be a number');
    }
    if (typeof bill.created_at !== 'string') {
      throw new Error('Bill created_at must be a string');
    }
    if (typeof bill.isOneTime !== 'boolean') {
      throw new Error('Bill isOneTime must be a boolean');
    }
    return true;
  };

  const generateIncomeOccurrences = (income: Income): Income[] => {
    const occurrences: Income[] = [];
    const currentDate = dayjs();
    const startDate = dayjs(income.date);
    // Generate occurrences for 12 months into the future
    const endDate = currentDate.add(12, 'months').endOf('month');

    switch (income.occurrenceType) {
      case 'once':
        occurrences.push(income);
        break;
      case 'monthly':
        let monthlyDate = startDate.clone();
        while (monthlyDate.isSameOrBefore(endDate)) {
          occurrences.push({
            ...income,
            id: `${income.id}-${monthlyDate.format('YYYY-MM-DD')}`,
            date: monthlyDate.toISOString()
          });
          monthlyDate = monthlyDate.add(1, 'month');
        }
        break;
      case 'biweekly':
        let biweeklyDate = startDate.clone();
        while (biweeklyDate.isSameOrBefore(endDate)) {
          occurrences.push({
            ...income,
            id: `${income.id}-${biweeklyDate.format('YYYY-MM-DD')}`,
            date: biweeklyDate.toISOString()
          });
          biweeklyDate = biweeklyDate.add(14, 'days');
        }
        break;
      case 'twice-monthly':
        // Generate twice-monthly occurrences based on selected days
        let currentMonth = startDate.clone().startOf('month');
        while (currentMonth.isSameOrBefore(endDate)) {
          // First occurrence on the selected first day
          const firstOccurrence = currentMonth.date(income.firstDate || 1);
          if (firstOccurrence.isValid()) {
            occurrences.push({
              ...income,
              id: `${income.id}-1-${firstOccurrence.format('YYYY-MM-DD')}`,
              date: firstOccurrence.toISOString()
            });
          }

          // Second occurrence on the selected second day
          const secondOccurrence = currentMonth.date(income.secondDate || 15);
          if (secondOccurrence.isValid()) {
            occurrences.push({
              ...income,
              id: `${income.id}-2-${secondOccurrence.format('YYYY-MM-DD')}`,
              date: secondOccurrence.toISOString()
            });
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

  const initializeDefaultData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const today = dayjs();

      const defaultIncomes: Income[] = [
        { id: generateId(), source: "Majdi's Salary", amount: 4739, date: today.date(1).toISOString(), occurrenceType: 'monthly' },
        { id: generateId(), source: "Ruba's Salary", amount: 2168, date: today.day(5).toISOString(), occurrenceType: 'monthly' }
      ];

      const defaultBills: Bill[] = [
        { id: generateId(), name: "ATT Phone Bill ($115 Rund Roaming)", amount: 429, day: 1, category_id: 8, category_name: "Phone & Internet", isOneTime: false, user_id: 1, created_at: today.toISOString() },
        { id: generateId(), name: "Maid's 1st payment", amount: 120, day: 1, category_id: 11, category_name: "Home Services", isOneTime: false, user_id: 1, created_at: today.toISOString() },
        { id: generateId(), name: "Monthly Rent", amount: 3750, day: 1, category_id: 1, category_name: "Housing", isOneTime: false, user_id: 1, created_at: today.toISOString() },
        { id: generateId(), name: "Sling TV (CC 9550)", amount: 75, day: 3, category_id: 10, category_name: "Entertainment", isOneTime: false, user_id: 1, created_at: today.toISOString() },
        { id: generateId(), name: "Cox Internet", amount: 81, day: 6, category_id: 9, category_name: "Internet", isOneTime: false, user_id: 1, created_at: today.toISOString() },
        { id: generateId(), name: "Water Bill", amount: 80, day: 7, category_id: 7, category_name: "Utilities", isOneTime: false, user_id: 1, created_at: today.toISOString() },
        { id: generateId(), name: "NV Energy Electrical", amount: 250, day: 7, category_id: 5, category_name: "Electricity", isOneTime: false, user_id: 1, created_at: today.toISOString() },
        { id: generateId(), name: "TransAmerica Life Insurance", amount: 77, day: 9, category_id: 13, category_name: "Insurance", isOneTime: false, user_id: 1, created_at: today.toISOString() },
        { id: generateId(), name: "Credit Card minimum payments", amount: 225, day: 14, category_id: 14, category_name: "Credit Cards", isOneTime: false, user_id: 1, created_at: today.toISOString() },
        { id: generateId(), name: "Apple/Google/YouTube (CC 9550)", amount: 130, day: 14, category_id: 12, category_name: "Subscriptions", isOneTime: false, user_id: 1, created_at: today.toISOString() },
        { id: generateId(), name: "Expenses & Groceries", amount: 3000, day: 16, category_id: 4, category_name: "Groceries", isOneTime: false, user_id: 1, created_at: today.toISOString() },
        { id: generateId(), name: "Maid's 2nd Payment", amount: 120, day: 17, category_id: 11, category_name: "Home Services", isOneTime: false, user_id: 1, created_at: today.toISOString() },
        { id: generateId(), name: "SoFi Personal Loan", amount: 1915, day: 17, category_id: 2, category_name: "Loans", isOneTime: false, user_id: 1, created_at: today.toISOString() },
        { id: generateId(), name: "Southwest Gas", amount: 75, day: 17, category_id: 6, category_name: "Gas", isOneTime: false, user_id: 1, created_at: today.toISOString() },
        { id: generateId(), name: "Car Insurance (3 cars)", amount: 704, day: 28, category_id: 3, category_name: "Auto Insurance", isOneTime: false, user_id: 1, created_at: today.toISOString() }
      ];

      // Validate default data
      defaultIncomes.forEach(isValidIncome);
      defaultBills.forEach(isValidBill);

      setIncomes(defaultIncomes);
      setBills(defaultBills);

      try {
        localStorage.setItem("budgetIncomes", JSON.stringify(defaultIncomes));
        localStorage.setItem("budgetBills", JSON.stringify(defaultBills));
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

  const refresh = async () => {
    try {
      setIsLoading(true);
      await loadData();
      logger.info("Successfully refreshed data");
    } catch (error) {
      logger.error("Error refreshing data:", { error });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let storedIncomes: Income[] = [];
      let storedBills: Bill[] = [];
      let shouldInitialize = false;

      try {
        const incomesData = localStorage.getItem("budgetIncomes");
        if (incomesData) {
          const parsedIncomes = JSON.parse(incomesData);
          parsedIncomes.forEach(isValidIncome);
          storedIncomes = parsedIncomes;
          logger.info("Successfully loaded incomes", { count: parsedIncomes.length });
        } else {
          shouldInitialize = true;
        }
      } catch (error) {
        logger.warn("Invalid stored incomes, will initialize defaults", { error });
        shouldInitialize = true;
      }

      try {
        const billsData = localStorage.getItem("budgetBills");
        if (billsData) {
          const parsedBills = JSON.parse(billsData);
          parsedBills.forEach(isValidBill);
          storedBills = parsedBills;
          logger.info("Successfully loaded bills", { count: parsedBills.length });
        } else {
          shouldInitialize = true;
        }
      } catch (error) {
        logger.warn("Invalid stored bills, will initialize defaults", { error });
        shouldInitialize = true;
      }

      if (shouldInitialize) {
        await initializeDefaultData();
      } else {
        setIncomes(storedIncomes);
        setBills(storedBills);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load data";
      logger.error("Error loading data:", { error });
      setError(new Error(errorMessage));
      // Attempt to initialize with defaults if loading fails
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
      setError(null);
      if (!isValidIncome(income)) {
        throw new Error("Invalid income data");
      }
      const newIncomes = [...incomes, income];
      setIncomes(newIncomes);
      localStorage.setItem("budgetIncomes", JSON.stringify(newIncomes));
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
      if (!isValidBill(bill)) {
        throw new Error("Invalid bill data");
      }
      const newBills = [...bills, bill];
      setBills(newBills);
      localStorage.setItem("budgetBills", JSON.stringify(newBills));
      logger.info("Successfully added bill", { bill });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add bill";
      logger.error("Error in addBill:", { error });
      setError(new Error(errorMessage));
      throw error;
    }
  };

  return (
    <DataContext.Provider value={{
      incomes: getMonthlyIncomeOccurrences(),
      bills,
      saveIncomes: async (newIncomes) => {
        try {
          setError(null);
          if (!Array.isArray(newIncomes)) {
            throw new Error("Income data must be an array");
          }
          newIncomes.forEach(isValidIncome);
          setIncomes(newIncomes);
          localStorage.setItem("budgetIncomes", JSON.stringify(newIncomes));
          logger.info("Successfully saved incomes", { count: newIncomes.length });
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
          if (!Array.isArray(newBills)) {
            throw new Error("Bill data must be an array");
          }
          newBills.forEach(isValidBill);
          setBills(newBills);
          localStorage.setItem("budgetBills", JSON.stringify(newBills));
          logger.info("Successfully saved bills", { count: newBills.length });
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
            localStorage.setItem("budgetIncomes", JSON.stringify(newIncomes));
            logger.info("Successfully deleted income", { income: transaction });
          } else {
            // It's a bill
            const newBills = bills.filter(b => b.id !== transaction.id);
            setBills(newBills);
            localStorage.setItem("budgetBills", JSON.stringify(newBills));
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
            if (!isValidIncome(transaction)) {
              throw new Error("Invalid income data");
            }
            const newIncomes = incomes.map(i => i.id === transaction.id ? transaction : i);
            setIncomes(newIncomes);
            localStorage.setItem("budgetIncomes", JSON.stringify(newIncomes));
            logger.info("Successfully edited income", { income: transaction });
          } else {
            // It's a bill
            if (!isValidBill(transaction)) {
              throw new Error("Invalid bill data");
            }
            const newBills = bills.map(b => b.id === transaction.id ? transaction : b);
            setBills(newBills);
            localStorage.setItem("budgetBills", JSON.stringify(newBills));
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
      refresh,
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