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
  const [isInitialized, setIsInitialized] = useState(false);

  const initializeDefaultData = () => {
    try {
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

      localStorage.setItem("incomes", JSON.stringify(defaultIncomes));
      localStorage.setItem("bills", JSON.stringify(defaultBills));
      setIncomes(defaultIncomes);
      setBills(defaultBills);
      console.log("Default data initialized");
    } catch (error) {
      console.error("Error initializing default data:", error);
    }
  };

  const saveIncomes = (newIncomes: Income[]) => {
    try {
      const sanitizedIncomes = newIncomes.map(income => ({
        ...income,
        amount: Number(income.amount),
        id: income.id || crypto.randomUUID()
      }));
      localStorage.setItem("incomes", JSON.stringify(sanitizedIncomes));
      setIncomes(sanitizedIncomes);
      console.log("Incomes saved:", sanitizedIncomes.length);
    } catch (error) {
      console.error("Error saving incomes:", error);
    }
  };

  const saveBills = (newBills: Bill[]) => {
    try {
      const sanitizedBills = newBills.map(bill => ({
        ...bill,
        amount: Number(bill.amount),
        id: bill.id || crypto.randomUUID()
      }));
      localStorage.setItem("bills", JSON.stringify(sanitizedBills));
      setBills(sanitizedBills);
      console.log("Bills saved:", sanitizedBills.length);
    } catch (error) {
      console.error("Error saving bills:", error);
    }
  };

  const resetData = () => {
    try {
      localStorage.clear();
      initializeDefaultData();
      console.log("Data reset completed");
    } catch (error) {
      console.error("Error resetting data:", error);
    }
  };

  useEffect(() => {
    if (!isInitialized) {
      try {
        const storedIncomes = localStorage.getItem("incomes");
        const storedBills = localStorage.getItem("bills");

        let shouldInitialize = false;

        if (storedIncomes) {
          try {
            const parsedIncomes = JSON.parse(storedIncomes);
            if (Array.isArray(parsedIncomes) && parsedIncomes.length > 0) {
              setIncomes(parsedIncomes);
              console.log("Loaded incomes:", parsedIncomes.length);
            } else {
              shouldInitialize = true;
            }
          } catch (error) {
            console.error("Error parsing incomes:", error);
            shouldInitialize = true;
          }
        } else {
          shouldInitialize = true;
        }

        if (storedBills) {
          try {
            const parsedBills = JSON.parse(storedBills);
            if (Array.isArray(parsedBills) && parsedBills.length > 0) {
              setBills(parsedBills);
              console.log("Loaded bills:", parsedBills.length);
            } else {
              shouldInitialize = true;
            }
          } catch (error) {
            console.error("Error parsing bills:", error);
            shouldInitialize = true;
          }
        } else {
          shouldInitialize = true;
        }

        if (shouldInitialize) {
          console.log("Initializing default data");
          initializeDefaultData();
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Error accessing localStorage:", error);
        initializeDefaultData();
      }
    }
  }, [isInitialized]);

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
