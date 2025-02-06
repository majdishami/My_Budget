import { createContext, useContext, useEffect, useState } from "react";
import { Income, Bill } from "@/types";
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
      { id: crypto.randomUUID(), source: "Majdi's Salary", amount: 4739, date: today.date(1).toISOString() },
      { id: crypto.randomUUID(), source: "Majdi's Salary", amount: 4739, date: today.date(15).toISOString() },
      { id: crypto.randomUUID(), source: "Ruba's Salary", amount: 2168, date: today.day(5).toISOString() }
    ];

    const defaultBills: Bill[] = [
      { id: crypto.randomUUID(), name: "ATT Phone Bill ($115 Rund Roaming)", amount: 429, day: 1 },
      { id: crypto.randomUUID(), name: "Maid's 1st payment", amount: 120, day: 1 },
      { id: crypto.randomUUID(), name: "Monthly Rent", amount: 3750, day: 1 },
      { id: crypto.randomUUID(), name: "Sling TV (CC 9550)", amount: 75, day: 3 },
      { id: crypto.randomUUID(), name: "Cox Internet", amount: 81, day: 6 },
      { id: crypto.randomUUID(), name: "Water Bill", amount: 80, day: 7 },
      { id: crypto.randomUUID(), name: "NV Energy Electrical ($100 winter months)", amount: 250, day: 7 },
      { id: crypto.randomUUID(), name: "TransAmerica Life Insurance", amount: 77, day: 9 },
      { id: crypto.randomUUID(), name: "Credit Card minimum payments", amount: 225, day: 14 },
      { id: crypto.randomUUID(), name: "Apple/Google/YouTube (CC 9550)", amount: 130, day: 14 },
      { id: crypto.randomUUID(), name: "Expenses & Groceries charged on (CC 2647)", amount: 3000, day: 16 },
      { id: crypto.randomUUID(), name: "Maid's 2nd Payment of the month", amount: 120, day: 17 },
      { id: crypto.randomUUID(), name: "SoFi Personal Loan", amount: 1915, day: 17 },
      { id: crypto.randomUUID(), name: "Southwest Gas ($200 in winter/$45 in summer)", amount: 75, day: 17 },
      { id: crypto.randomUUID(), name: "Car Insurance for 3 cars ($268 + $169 + $303 + $21)", amount: 704, day: 28 }
    ];

    try {
      localStorage.setItem("incomes", JSON.stringify(defaultIncomes));
      localStorage.setItem("bills", JSON.stringify(defaultBills));
      setIncomes(defaultIncomes);
      setBills(defaultBills);
    } catch (error) {
      console.error("Error initializing default data:", error);
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
        id: income.id || crypto.randomUUID(),
        amount: Number(income.amount)
      }));

      setIncomes(sanitizedIncomes);
      localStorage.setItem("incomes", JSON.stringify(sanitizedIncomes));
    } catch (error) {
      console.error("Error saving incomes:", error);
      // Revert to last known good state
      const storedIncomes = localStorage.getItem("incomes");
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
        id: bill.id || crypto.randomUUID(),
        amount: Number(bill.amount)
      }));

      setBills(sanitizedBills);
      localStorage.setItem("bills", JSON.stringify(sanitizedBills));
    } catch (error) {
      console.error("Error saving bills:", error);
      // Revert to last known good state
      const storedBills = localStorage.getItem("bills");
      if (storedBills) {
        setBills(JSON.parse(storedBills));
      }
    }
  };

  const resetData = () => {
    try {
      localStorage.clear();
      initializeDefaultData();
    } catch (error) {
      console.error("Error resetting data:", error);
    }
  };

  // Load data on mount
  useEffect(() => {
    try {
      const storedIncomes = localStorage.getItem("incomes");
      const storedBills = localStorage.getItem("bills");

      let shouldInitialize = false;

      if (storedIncomes) {
        try {
          const parsedIncomes = JSON.parse(storedIncomes);
          if (Array.isArray(parsedIncomes) && parsedIncomes.every(isValidIncome)) {
            setIncomes(parsedIncomes);
          } else {
            console.warn("Invalid stored incomes format");
            shouldInitialize = true;
          }
        } catch {
          console.error("Error parsing stored incomes");
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
          } else {
            console.warn("Invalid stored bills format");
            shouldInitialize = true;
          }
        } catch {
          console.error("Error parsing stored bills");
          shouldInitialize = true;
        }
      } else {
        shouldInitialize = true;
      }

      if (shouldInitialize) {
        initializeDefaultData();
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error);
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