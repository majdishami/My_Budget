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
  resetData: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Validate data structure with more specific error messages
  const isValidIncome = (income: any): income is Income => {
    if (typeof income !== 'object' || income === null) {
      throw new Error('Income must be an object');
    }
    if (typeof income.id !== 'string') {
      throw new Error('Income ID must be a string');
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
    return true;
  };

  const isValidBill = (bill: any): bill is Bill => {
    if (typeof bill !== 'object' || bill === null) {
      throw new Error('Bill must be an object');
    }
    if (typeof bill.id !== 'string') {
      throw new Error('Bill ID must be a string');
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
    return true;
  };

  const initializeDefaultData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const today = dayjs();

      const defaultIncomes: Income[] = [
        { id: generateId(), source: "Majdi's Salary", amount: 4739, date: today.date(1).toISOString() },
        { id: generateId(), source: "Majdi's Salary", amount: 4739, date: today.date(15).toISOString() },
        { id: generateId(), source: "Ruba's Salary", amount: 2168, date: today.day(5).toISOString() }
      ];

      const defaultBills: Bill[] = [
        { id: generateId(), name: "ATT Phone Bill ($115 Rund Roaming)", amount: 429, day: 1 },
        { id: generateId(), name: "Maid's 1st payment", amount: 120, day: 1 },
        { id: generateId(), name: "Monthly Rent", amount: 3750, day: 1 },
        { id: generateId(), name: "Sling TV (CC 9550)", amount: 75, day: 3 },
        { id: generateId(), name: "Cox Internet", amount: 81, day: 6 },
        { id: generateId(), name: "Water Bill", amount: 80, day: 7 },
        { id: generateId(), name: "NV Energy Electrical ($100 winter months)", amount: 250, day: 7 },
        { id: generateId(), name: "TransAmerica Life Insurance", amount: 77, day: 9 },
        { id: generateId(), name: "Credit Card minimum payments", amount: 225, day: 14 },
        { id: generateId(), name: "Apple/Google/YouTube (CC 9550)", amount: 130, day: 14 },
        { id: generateId(), name: "Expenses & Groceries charged on (CC 2647)", amount: 3000, day: 16 },
        { id: generateId(), name: "Maid's 2nd Payment of the month", amount: 120, day: 17 },
        { id: generateId(), name: "SoFi Personal Loan", amount: 1915, day: 17 },
        { id: generateId(), name: "Southwest Gas ($200 in winter/$45 in summer)", amount: 75, day: 17 },
        { id: generateId(), name: "Car Insurance for 3 cars ($268 + $169 + $303 + $21)", amount: 704, day: 28 }
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
        logger.error("Failed to save default data to localStorage", storageError);
        throw new Error("Failed to save default data to storage");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to initialize data";
      logger.error("Error in initializeDefaultData:", error);
      setError(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const saveIncomes = async (newIncomes: Income[]) => {
    try {
      setError(null);
      if (!Array.isArray(newIncomes)) {
        throw new Error("Income data must be an array");
      }

      // Validate all incomes
      newIncomes.forEach(isValidIncome);

      const sanitizedIncomes = newIncomes.map(income => ({
        ...income,
        id: income.id || generateId(),
        amount: Number(income.amount)
      }));

      setIncomes(sanitizedIncomes);
      localStorage.setItem("budgetIncomes", JSON.stringify(sanitizedIncomes));
      logger.info("Successfully saved incomes", { count: sanitizedIncomes.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save incomes";
      logger.error("Error in saveIncomes:", error);
      setError(new Error(errorMessage));
      throw error;
    }
  };

  const saveBills = async (newBills: Bill[]) => {
    try {
      setError(null);
      if (!Array.isArray(newBills)) {
        throw new Error("Bill data must be an array");
      }

      // Validate all bills
      newBills.forEach(isValidBill);

      const sanitizedBills = newBills.map(bill => ({
        ...bill,
        id: bill.id || generateId(),
        amount: Number(bill.amount)
      }));

      setBills(sanitizedBills);
      localStorage.setItem("budgetBills", JSON.stringify(sanitizedBills));
      logger.info("Successfully saved bills", { count: sanitizedBills.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save bills";
      logger.error("Error in saveBills:", error);
      setError(new Error(errorMessage));
      throw error;
    }
  };

  const resetData = async () => {
    try {
      setError(null);
      localStorage.removeItem("budgetIncomes");
      localStorage.removeItem("budgetBills");
      logger.info("Successfully cleared data");
      await initializeDefaultData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to reset data";
      logger.error("Error in resetData:", error);
      setError(new Error(errorMessage));
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (typeof window === 'undefined' || !window.localStorage) {
          throw new Error("localStorage is not available");
        }

        const storedIncomes = localStorage.getItem("budgetIncomes");
        const storedBills = localStorage.getItem("budgetBills");

        let shouldInitialize = false;

        if (storedIncomes) {
          try {
            const parsedIncomes = JSON.parse(storedIncomes);
            parsedIncomes.forEach(isValidIncome);
            setIncomes(parsedIncomes);
            logger.info("Successfully loaded incomes", { count: parsedIncomes.length });
          } catch (error) {
            logger.warn("Invalid stored incomes, will initialize defaults", error);
            shouldInitialize = true;
          }
        } else {
          shouldInitialize = true;
        }

        if (storedBills) {
          try {
            const parsedBills = JSON.parse(storedBills);
            parsedBills.forEach(isValidBill);
            setBills(parsedBills);
            logger.info("Successfully loaded bills", { count: parsedBills.length });
          } catch (error) {
            logger.warn("Invalid stored bills, will initialize defaults", error);
            shouldInitialize = true;
          }
        } else {
          shouldInitialize = true;
        }

        if (shouldInitialize) {
          await initializeDefaultData();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load data";
        logger.error("Error loading data:", error);
        setError(new Error(errorMessage));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <DataContext.Provider value={{ 
      incomes, 
      bills, 
      saveIncomes, 
      saveBills, 
      resetData, 
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