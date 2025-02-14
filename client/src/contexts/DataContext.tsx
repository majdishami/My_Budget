import { createContext, useContext, useState, useEffect } from "react";
import { Income, Bill } from "@/types";
import dayjs from "dayjs";
import { logger } from "@/lib/logger";

interface DataContextType {
  incomes: Income[];
  bills: Bill[];
  saveIncomes: (newIncomes: Income[]) => Promise<void>;
  saveBills: (newBills: Bill[]) => Promise<void>;
  addIncome: (income: Income) => Promise<void>;
  addBill: (bill: Bill) => Promise<void>;
  deleteTransaction: (transaction: Income | Bill) => Promise<void>;
  editTransaction: (transaction: Income | Bill) => Promise<void>;
  resetData: () => Promise<void>;
  refresh: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Restore the useEffect for initial data loading
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      logger.info('[DataContext] Starting to fetch transactions...');
      const response = await fetch('/api/transactions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load transactions: ${response.status} ${response.statusText}`);
      }

      const transactions = await response.json();
      logger.info('[DataContext] Raw transactions:', transactions);

      // Process incomes and bills
      const loadedIncomes = transactions
        .filter((t: any) => t.type === 'income')
        .map((t: any) => {
          const parsedDate = dayjs(t.date).startOf('day');
          const income = {
            id: t.id.toString(),
            source: t.description,
            amount: parseFloat(t.amount),
            date: parsedDate.toISOString(),
            occurrenceType: t.recurring_id ? 'recurring' : 'once'
          };
          logger.info('[DataContext] Processed income:', income);
          return income;
        });

      const loadedBills = transactions
        .filter((t: any) => t.type === 'expense')
        .map((t: any) => {
          const parsedDate = dayjs(t.date).startOf('day');
          const bill = {
            id: t.id.toString(),
            name: t.description,
            amount: parseFloat(t.amount),
            date: parsedDate.toISOString(),
            isOneTime: !t.recurring_id,
            day: parsedDate.date(),
            category_id: t.category_id
          };
          logger.info('[DataContext] Processed bill:', bill);
          return bill;
        });

      logger.info('[DataContext] All processed incomes:', loadedIncomes);
      logger.info('[DataContext] All processed bills:', loadedBills);

      setIncomes(loadedIncomes);
      setBills(loadedBills);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load data";
      logger.error("[DataContext] Error loading data:", { error });
      setError(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const editTransaction = async (transaction: Income | Bill) => {
    try {
      setError(null);
      const isIncome = 'source' in transaction;
      logger.info('[DataContext] Editing transaction:', { transaction, isIncome });

      // Special handling for recurring occurrences
      let occurrencePayload = {};
      if (isIncome && transaction.occurrenceType !== 'once') {
        occurrencePayload = {
          recurring_id: 1,
          occurrence_type: transaction.occurrenceType
        };
      } else if (!isIncome && !transaction.isOneTime) {
        occurrencePayload = {
          recurring_id: 1,
          day: transaction.day
        };
      }

      const payload = {
        description: isIncome ? transaction.source : transaction.name,
        amount: typeof transaction.amount === 'string' ? parseFloat(transaction.amount) : transaction.amount,
        date: transaction.date,
        type: isIncome ? 'income' : 'expense',
        category_id: !isIncome && transaction.category_id ? Number(transaction.category_id) : null,
        ...occurrencePayload
      };

      logger.info('[DataContext] Edit transaction payload:', payload);

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error("[DataContext] Edit transaction failed:", {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(`Failed to edit transaction: ${errorData.message || response.statusText}`);
      }

      // Get the updated transaction from the server
      const updatedTransaction = await response.json();
      logger.info('[DataContext] Server response after edit:', updatedTransaction);

      // Update local state with the server response data to ensure consistency
      if (isIncome) {
        setIncomes(prevIncomes => 
          prevIncomes.map(inc => {
            // For recurring incomes, update all instances with the same source
            if (inc.source === transaction.source && inc.occurrenceType !== 'once') {
              return {
                ...inc,
                source: updatedTransaction.description,
                amount: parseFloat(updatedTransaction.amount),
                occurrenceType: updatedTransaction.occurrence_type || inc.occurrenceType
              };
            }
            // For one-time incomes or different sources, only update the matching ID
            return inc.id === transaction.id ? {
              ...inc,
              source: updatedTransaction.description,
              amount: parseFloat(updatedTransaction.amount),
              date: dayjs(updatedTransaction.date).startOf('day').toISOString()
            } : inc;
          })
        );
      } else {
        setBills(prevBills => 
          prevBills.map(bill => {
            // For recurring bills, update all instances with the same name
            if (bill.name === transaction.name && !bill.isOneTime) {
              return {
                ...bill,
                name: updatedTransaction.description,
                amount: parseFloat(updatedTransaction.amount),
                day: dayjs(updatedTransaction.date).date()
              };
            }
            // For one-time bills or different names, only update the matching ID
            return bill.id === transaction.id ? {
              ...bill,
              name: updatedTransaction.description,
              amount: parseFloat(updatedTransaction.amount),
              date: dayjs(updatedTransaction.date).startOf('day').toISOString(),
              day: dayjs(updatedTransaction.date).date()
            } : bill;
          })
        );
      }

      // Refresh data to ensure consistency with server
      await loadData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to edit transaction";
      logger.error("[DataContext] Error in editTransaction:", { error });
      setError(new Error(errorMessage));
      throw error;
    }
  };

  return (
    <DataContext.Provider
      value={{
        incomes,
        bills,
        saveIncomes: async (newIncomes) => {
          setIncomes(newIncomes);
          await loadData();
        },
        saveBills: async (newBills) => {
          setBills(newBills);
          await loadData();
        },
        addIncome: async (income) => {
          try {
            const response = await fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                description: income.source,
                amount: income.amount,
                date: income.date,
                type: 'income'
              }),
            });

            if (!response.ok) throw new Error('Failed to add income');
            await loadData();
          } catch (error) {
            logger.error("Error adding income:", { error });
            throw error;
          }
        },
        addBill: async (bill) => {
          try {
            const response = await fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                description: bill.name,
                amount: bill.amount,
                date: bill.date,
                type: 'expense',
                category_id: bill.category_id
              }),
            });

            if (!response.ok) throw new Error('Failed to add bill');
            await loadData();
          } catch (error) {
            logger.error("Error adding bill:", { error });
            throw error;
          }
        },
        deleteTransaction: async (transaction) => {
          try {
            setError(null);
            const response = await fetch(`/api/transactions/${transaction.id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json'
              }
            });

            if (!response.ok) {
              throw new Error('Failed to delete transaction');
            }

            if ('source' in transaction) {
              setIncomes(prev => prev.filter(i => i.id !== transaction.id));
            } else {
              setBills(prev => prev.filter(b => b.id !== transaction.id));
            }

            await loadData();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to delete transaction";
            logger.error("Error in deleteTransaction:", { error });
            setError(new Error(errorMessage));
            throw error;
          }
        },
        editTransaction,
        resetData: async () => {
          try {
            setError(null);
            await loadData();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to reset data";
            logger.error("Error in resetData:", { error });
            setError(new Error(errorMessage));
            throw error;
          }
        },
        refresh: loadData,
        isLoading,
        error
      }}
    >
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