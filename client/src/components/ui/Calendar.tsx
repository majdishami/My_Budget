import * as React from "react";
import { DayPicker } from "react-day-picker";
import DayContent from "../DayContent";  // Ensure correct import
import { Bill, Income, Transaction } from "@/types";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  bills?: Bill[];
  incomes?: Income[];
  transactions?: Transaction[];
  expenses?: Transaction[];
  onDayClick?: (dayNumber: number) => void;
};

const Calendar = ({
  showOutsideDays = true,
  bills = [],
  incomes = [],
  transactions = [],
  expenses = [],
  onDayClick,
  ...props
}: CalendarProps) => {
  const allTransactions = React.useMemo(() => {
    const safeBills = Array.isArray(bills) ? bills.map((b) => ({ ...b, type: "bill" })) : [];
    const safeIncomes = Array.isArray(incomes) ? incomes.map((i) => ({ ...i, type: "income" })) : [];
    const safeExpenses = Array.isArray(expenses) ? expenses.map((e) => ({ ...e, type: "expense" })) : [];

    return [...safeBills, ...safeIncomes, ...safeExpenses].map((transaction) => ({
      ...transaction,
      date: new Date(transaction.date).toISOString().split("T")[0],
    }));
  }, [bills, incomes, expenses]);

  return (
    <DayPicker
      {...props}
      components={{
        DayContent: ({ date }) => {
          const formattedDate = date.toISOString().split("T")[0];

          const dayTransactions = allTransactions.filter(
            (transaction) => transaction.date === formattedDate
          );

          const dayBills = dayTransactions.filter((transaction) => transaction.type === "bill");
          const dayIncomes = dayTransactions.filter((transaction) => transaction.type === "income");
          const dayExpenses = dayTransactions.filter((transaction) => transaction.type === "expense");

          return (
            <DayContent
              day={date}
              bills={dayBills}
              incomes={dayIncomes}
              expenses={dayExpenses} // Ensure expenses are passed correctly
              onClick={(dayNumber) => console.log(`Day clicked: ${dayNumber}`)}
            />
          );
        },
      }}
    />
  );
};

export { Calendar };
export default Calendar;
