import { useContext } from 'react';
import { DataContext, DataContextType } from '@/contexts/DataContext';

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

export const useIncomes = () => {
  const { incomes } = useData();
  return { data: incomes };
};

export const useBills = () => {
  const { bills } = useData();
  return { data: bills };
};