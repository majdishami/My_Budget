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
      setIncomes(defaultIncomes);
      setBills(defaultBills);

      // Save to localStorage after state updates
      window.localStorage.setItem("incomes", JSON.stringify(defaultIncomes));
      window.localStorage.setItem("bills", JSON.stringify(defaultBills));

      console.log("[DataContext] Initialized default data", { incomes: defaultIncomes.length, bills: defaultBills.length });
    } catch (error) {
      console.error("[DataContext] Error initializing default data:", error);
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

      // Then persist to localStorage
      window.localStorage.setItem("incomes", JSON.stringify(sanitizedIncomes));
      console.log("[DataContext] Saved incomes successfully", { count: sanitizedIncomes.length });
    } catch (error) {
      console.error("[DataContext] Error saving incomes:", error);
      // Revert to last known good state
      const storedIncomes = window.localStorage.getItem("incomes");
      if (storedIncomes) {
        setIncomes(JSON.parse(storedIncomes));
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

      // Then persist to localStorage
      window.localStorage.setItem("bills", JSON.stringify(sanitizedBills));
      console.log("[DataContext] Saved bills successfully", { count: sanitizedBills.length });
    } catch (error) {
      console.error("[DataContext] Error saving bills:", error);
      // Revert to last known good state
      const storedBills = window.localStorage.getItem("bills");
      if (storedBills) {
        setBills(JSON.parse(storedBills));
      }
    }
  };

  const resetData = () => {
    try {
      window.localStorage.clear();
      initializeDefaultData();
      console.log("[DataContext] Data reset completed");
    } catch (error) {
      console.error("[DataContext] Error resetting data:", error);
    }
  };

  // Load data on mount
  useEffect(() => {
    try {
      const storedIncomes = window.localStorage.getItem("incomes");
      const storedBills = window.localStorage.getItem("bills");

      let shouldInitialize = false;

      if (storedIncomes) {
        try {
          const parsedIncomes = JSON.parse(storedIncomes);
          if (Array.isArray(parsedIncomes) && parsedIncomes.every(isValidIncome)) {
            setIncomes(parsedIncomes);
            console.log("[DataContext] Loaded incomes successfully", { count: parsedIncomes.length });
          } else {
            console.warn("[DataContext] Invalid stored incomes format");
            shouldInitialize = true;
          }
        } catch {
          console.error("[DataContext] Error parsing stored incomes");
          shouldInitialize = true;
        }
      } else {
        shouldInitialize = true;
      }

      if (storedBills) {
        try {
          const parsedBills = JSON.parse(storedBills);
          if (Array.isArray(parsedBills) && parsedBills.every(isValidBill)) {
            setBills(parsedBills);
            console.log("[DataContext] Loaded bills successfully", { count: parsedBills.length });
          } else {
            console.warn("[DataContext] Invalid stored bills format");
            shouldInitialize = true;
          }
        } catch {
          console.error("[DataContext] Error parsing stored bills");
          shouldInitialize = true;
        }
      } else {
        shouldInitialize = true;
      }

      if (shouldInitialize) {
        console.log("[DataContext] Initializing default data due to missing or invalid stored data");
        initializeDefaultData();
      }
    } catch (error) {
      console.error("[DataContext] Error accessing localStorage:", error);
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