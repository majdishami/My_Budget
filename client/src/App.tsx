import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Budget from "@/pages/Budget";
import MonthlyToDate from "@/pages/monthly-to-date";
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

interface Income {
  id: string;
  source: string;
  amount: number;
  date: string;
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  day: number;
}


function Router() {
  return (
    <Switch>
      <Route path="/" component={Budget} />
      <Route path="/reports/monthly-to-date" component={MonthlyToDate} />
    </Switch>
  );
}

function App() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  useEffect(() => {
    // Clear existing data first
    localStorage.removeItem("incomes");
    localStorage.removeItem("bills");

    const storedIncomes = localStorage.getItem("incomes");
    const storedBills = localStorage.getItem("bills");

    if (!storedIncomes) {
      const today = dayjs();
      const sampleIncomes: Income[] = [
        { id: "1", source: "Majdi's Salary", amount: Math.round(4739), date: today.date(1).toISOString() },
        { id: "2", source: "Majdi's Salary", amount: Math.round(4739), date: today.date(15).toISOString() },
        { id: "3", source: "Ruba's Salary", amount: Math.round(2168), date: "2025-01-10" }
      ];
      setIncomes(sampleIncomes);
      localStorage.setItem("incomes", JSON.stringify(sampleIncomes));
    } else {
      setIncomes(JSON.parse(storedIncomes).map((income: Income) => ({
        ...income,
        amount: Math.round(income.amount)
      })));
    }

    if (!storedBills) {
      const sampleBills: Bill[] = [
        { id: "1", name: "ATT Phone Bill ($115 Rund Roaming)", amount: Math.round(429), day: 1 },
        { id: "2", name: "Maid's 1st payment", amount: Math.round(120), day: 1 },
        { id: "3", name: "Monthly Rent", amount: Math.round(3750), day: 1 },
        { id: "4", name: "Sling TV (CC 9550)", amount: Math.round(75), day: 3 },
        { id: "5", name: "Cox Internet", amount: Math.round(81), day: 6 },
        { id: "6", name: "Water Bill", amount: Math.round(80), day: 7 },
        { id: "7", name: "NV Energy Electrical ($100 winter months)", amount: Math.round(250), day: 7 },
        { id: "8", name: "TransAmerica Life Insurance", amount: Math.round(77), day: 9 },
        { id: "9", name: "Credit Card minimum payments", amount: Math.round(225), day: 14 },
        { id: "10", name: "Apple/Google/YouTube (CC 9550)", amount: Math.round(130), day: 14 },
        { id: "11", name: "Expenses & Groceries charged on (CC 2647)", amount: Math.round(3000), day: 16 },
        { id: "12", name: "Maid's 2nd Payment of the month", amount: Math.round(120), day: 17 },
        { id: "13", name: "SoFi Personal Loan", amount: Math.round(1915), day: 17 },
        { id: "14", name: "Southwest Gas ($200 in winter/$45 in summer)", amount: Math.round(75), day: 17 },
        { id: "15", name: "Car Insurance for 3 cars ($268 + $169 + $303 + $21)", amount: Math.round(704), day: 28 }
      ];
      setBills(sampleBills);
      localStorage.setItem("bills", JSON.stringify(sampleBills));
    } else {
      setBills(JSON.parse(storedBills).map((bill: Bill) => ({
        ...bill,
        amount: Math.round(bill.amount)
      })));
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;