import dayjs from "dayjs";
import { useEffect } from "react";

export default function DayContent({
  day,
  bills = [],
  incomes = [],
  expenses = [],
  onClick,
}: {
  day: Date;
  bills?: { date: string; amount: number }[];
  incomes?: { date: string; amount: number }[];
  expenses?: { date: string; amount: number }[];
  onClick?: (dayNumber: number) => void;
}) {
  const currentMonth = dayjs(day).month();
  const currentYear = dayjs(day).year();

  useEffect(() => {
    if (localStorage.getItem("theme") === "dark" || !("theme" in localStorage)) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  }, []);

  // Debugging logs
  console.log("Day:", dayjs(day).format("DD MMM"));
  console.log("Bills Received:", bills);
  console.log("Incomes Received:", incomes);
  console.log("Expenses Received:", expenses);

  // Filter transactions for the specific day
  const dayBills = bills.filter(bill => bill.date && dayjs(bill.date).isSame(day, "day"));
  const dayIncomes = incomes.filter(income => income.date && dayjs(income.date).isSame(day, "day"));
  const dayExpenses = expenses.filter(expense => expense.date && dayjs(expense.date).isSame(day, "day"));

  console.log("Filtered Day Expenses:", dayExpenses);
  console.log("Filtered Day Bills:", dayBills);

  return (
    <div onClick={() => onClick?.(dayjs(day).date())} className="dark:bg-gray-900 dark:text-white p-2 border border-gray-700 rounded-md">
      <div className="font-bold">{dayjs(day).format("DD MMM")}</div>

      <div className="text-green-400">Incomes: {dayIncomes.length}</div>
      {dayIncomes.map((income, index) => (
        <div key={`income-${index}`} className="text-green-400 text-xs">+${income.amount}</div>
      ))}

      <div className="text-red-500">Expenses: {dayExpenses.length}</div>
      {dayExpenses.map((expense, index) => (
        <div key={`expense-${index}`} className="text-red-500 text-xs">-${expense.amount}</div>
      ))}

      <div className="text-yellow-400">Bills: {dayBills.length}</div>
      {dayBills.map((bill, index) => (
        <div key={`bill-${index}`} className="text-yellow-400 text-xs">-${bill.amount}</div>
      ))}
    </div>
  );
}
