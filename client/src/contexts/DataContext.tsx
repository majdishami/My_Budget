import { createContext, useContext, useEffect, useState } from "react";
import { Income, Bill } from "@/types";
import { generateId } from "@/lib/utils";
import dayjs from "dayjs";

interface DataContextType {
  incomes: Income[];
  bills: Bill[];
  saveIncomes: (newIncomes: Income[]) => void;
  saveBills: (newBills: Bill[]) => void;
  resetData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  // Validate data structure
  const isValidIncome = (income: any): income is Income => {
    return (
      typeof income === 'object' &&
      income !== null &&
      typeof income.id === 'string' &&
      typeof income.source === 'string' &&
      typeof income.amount === 'number' &&
      typeof income.date === 'string' &&
      !isNaN(new Date(income.date).getTime())
    );
  };

  const isValidBill = (bill: any): bill is Bill => {
    return (
      typeof bill === 'object' &&
      bill !== null &&
      typeof bill.id === 'string' &&
      typeof bill.name === 'string' &&
      typeof bill.amount === 'number' &&
      typeof bill.day === 'number' &&
      bill.day >= 1 &&
      bill.day <= 31
    );
  };

  const initializeDefaultData = () => {
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

    try {
      // Set state first
      setIncomes(defaultIncomes);
      setBills(defaultBills);

      // Then try to save to localStorage
      try {
        window.localStorage.setItem("budgetIncomes", JSON.stringify(defaultIncomes));
        window.localStorage.setItem("budgetBills", JSON.stringify(defaultBills));
        console.log("[DataContext] Successfully saved default data to localStorage");
      } catch (storageError) {
        console.error("[DataContext] Failed to save to localStorage:", storageError);
      }
    } catch (error) {
      console.error("[DataContext] Error in initializeDefaultData:", error);
    }
  };

  const saveIncomes = (newIncomes: Income[]) => {
    try {
      // Validate all incomes before saving
      if (!Array.isArray(newIncomes) || !newIncomes.every(isValidIncome)) {
        throw new Error("Invalid income data structure");
      }

      // Ensure all incomes have an ID and amount is a number
      const sanitizedIncomes = newIncomes.map(income => ({
        ...income,
        id: income.id || generateId(),
        amount: Number(income.amount)
      }));

      // Update state first
      setIncomes(sanitizedIncomes);
      console.log("[DataContext] State updated with new incomes", { count: sanitizedIncomes.length });

      // Then try to save to localStorage
      try {
        window.localStorage.setItem("budgetIncomes", JSON.stringify(sanitizedIncomes));
        console.log("[DataContext] Successfully saved incomes to localStorage");
      } catch (storageError) {
        console.error("[DataContext] Failed to save incomes to localStorage:", storageError);
        throw storageError;
      }
    } catch (error) {
      console.error("[DataContext] Error in saveIncomes:", error);
      // Attempt to revert to last known good state
      try {
        const storedIncomes = window.localStorage.getItem("budgetIncomes");
        if (storedIncomes) {
          const parsedIncomes = JSON.parse(storedIncomes);
          setIncomes(parsedIncomes);
          console.log("[DataContext] Successfully reverted to previous income state");
        }
      } catch (revertError) {
        console.error("[DataContext] Failed to revert incomes:", revertError);
      }
    }
  };

  const saveBills = (newBills: Bill[]) => {
    try {
      // Validate all bills before saving
      if (!Array.isArray(newBills) || !newBills.every(isValidBill)) {
        throw new Error("Invalid bill data structure");
      }

      // Ensure all bills have an ID and amount is a number
      const sanitizedBills = newBills.map(bill => ({
        ...bill,
        id: bill.id || generateId(),
        amount: Number(bill.amount)
      }));

      // Update state first
      setBills(sanitizedBills);
      console.log("[DataContext] State updated with new bills", { count: sanitizedBills.length });

      // Then try to save to localStorage
      try {
        window.localStorage.setItem("budgetBills", JSON.stringify(sanitizedBills));
        console.log("[DataContext] Successfully saved bills to localStorage");
      } catch (storageError) {
        console.error("[DataContext] Failed to save bills to localStorage:", storageError);
        throw storageError;
      }
    } catch (error) {
      console.error("[DataContext] Error in saveBills:", error);
      // Attempt to revert to last known good state
      try {
        const storedBills = window.localStorage.getItem("budgetBills");
        if (storedBills) {
          const parsedBills = JSON.parse(storedBills);
          setBills(parsedBills);
          console.log("[DataContext] Successfully reverted to previous bills state");
        }
      } catch (revertError) {
        console.error("[DataContext] Failed to revert bills:", revertError);
      }
    }
  };

  const resetData = () => {
    try {
      window.localStorage.removeItem("budgetIncomes");
      window.localStorage.removeItem("budgetBills");
      console.log("[DataContext] Cleared localStorage");
      initializeDefaultData();
    } catch (error) {
      console.error("[DataContext] Error in resetData:", error);
    }
  };

  // Load data on mount
  useEffect(() => {
    try {
      // Check if localStorage is available
      if (typeof window === 'undefined' || !window.localStorage) {
        console.error("[DataContext] localStorage is not available");
        initializeDefaultData();
        return;
      }

      const storedIncomes = window.localStorage.getItem("budgetIncomes");
      const storedBills = window.localStorage.getItem("budgetBills");
      console.log("[DataContext] Retrieved from localStorage:", { 
        hasIncomes: !!storedIncomes, 
        hasBills: !!storedBills 
      });

      let shouldInitialize = false;

      if (storedIncomes) {
        try {
          const parsedIncomes = JSON.parse(storedIncomes);
          if (Array.isArray(parsedIncomes) && parsedIncomes.every(isValidIncome)) {
            setIncomes(parsedIncomes);
            console.log("[DataContext] Successfully loaded incomes", { count: parsedIncomes.length });
          } else {
            console.warn("[DataContext] Invalid stored incomes format");
            shouldInitialize = true;
          }
        } catch (parseError) {
          console.error("[DataContext] Failed to parse stored incomes:", parseError);
          shouldInitialize = true;
        }
      } else {
        console.log("[DataContext] No stored incomes found");
        shouldInitialize = true;
      }

      if (storedBills) {
        try {
          const parsedBills = JSON.parse(storedBills);
          if (Array.isArray(parsedBills) && parsedBills.every(isValidBill)) {
            setBills(parsedBills);
            console.log("[DataContext] Successfully loaded bills", { count: parsedBills.length });
          } else {
            console.warn("[DataContext] Invalid stored bills format");
            shouldInitialize = true;
          }
        } catch (parseError) {
          console.error("[DataContext] Failed to parse stored bills:", parseError);
          shouldInitialize = true;
        }
      } else {
        console.log("[DataContext] No stored bills found");
        shouldInitialize = true;
      }

      if (shouldInitialize) {
        console.log("[DataContext] Initializing default data");
        initializeDefaultData();
      }
    } catch (error) {
      console.error("[DataContext] Error in initialization:", error);
      initializeDefaultData();
    }
  }, []);

  return (
    <DataContext.Provider value={{ incomes, bills, saveIncomes, saveBills, resetData }}>
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