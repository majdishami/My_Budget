import { useContext } from 'react';
import { DataContext } from '@/contexts/DataContext';

export const useIncomes = () => {
  const { incomes } = useContext(DataContext);
  return { data: incomes };
};

export const useBills = () => {
  const { bills } = useContext(DataContext);
  return { data: bills };
};
