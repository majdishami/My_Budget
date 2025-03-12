import { createContext, useContext, useState } from "react";
import { Bill } from "@/types";

// Define context type
interface DataContextType {
  data: any;
  setData: React.Dispatch<React.SetStateAction<any>>;
  incomes: any[];
  setIncomes: React.Dispatch<React.SetStateAction<any[]>>;
  bills: Bill[];
  setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
}

// Create context with a default undefined value
const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(null);
  const [incomes, setIncomes] = useState<any[]>([]); // ✅ Added incomes state
  const [bills, setBills] = useState<Bill[]>([]); // ✅ Ensured bills state is inside function

  return (
    <DataContext.Provider value={{ data, setData, incomes, setIncomes, bills, setBills }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
