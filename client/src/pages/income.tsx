import { useState, useEffect } from 'react';
import IncomeReportDialog from "@/components/IncomeReportDialog";
import { useLocation } from "wouter";
import { Income } from "@/types";
import dayjs from "dayjs";
import { useIncomes } from "@/hooks/useData";

export default function IncomeReport() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [, setLocation] = useLocation();
  const { data: incomes = [] } = useIncomes();
  const today = dayjs('2025-02-14'); // Current date

  // Calculate total monthly income based on recurring patterns
  const calculateMonthlyIncome = () => {
    let totalIncome = 0;

    // Process Majdi's salary (twice monthly)
    const majdiSalary = incomes.find(income => income.source === "Majdi's Salary");
    if (majdiSalary) {
      totalIncome += majdiSalary.amount * 2; // Both monthly payments
    }

    // Process Ruba's salary (biweekly)
    const rubaSalary = incomes.find(income => income.source === "Ruba's Salary");
    if (rubaSalary) {
      // Calculate biweekly payments starting from Jan 10, 2025
      const startDate = dayjs('2025-01-10');
      const monthStart = today.startOf('month');
      const monthEnd = today.endOf('month');
      let currentDate = startDate;

      while (currentDate.isBefore(monthEnd) || currentDate.isSame(monthEnd, 'day')) {
        if (currentDate.day() === 5 && // Friday
            (currentDate.isAfter(monthStart) || currentDate.isSame(monthStart, 'day')) &&
            (currentDate.isBefore(monthEnd) || currentDate.isSame(monthEnd, 'day'))) {
          totalIncome += rubaSalary.amount;
        }
        currentDate = currentDate.add(14, 'day'); // Move to next biweekly Friday
      }
    }

    return totalIncome;
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setLocation("/");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Income Report</h1>
      <IncomeReportDialog
        isOpen={isDialogOpen}
        onOpenChange={handleOpenChange}
        incomes={incomes}
        totalMonthlyIncome={calculateMonthlyIncome()}
        currentDate={today}
      />
    </div>
  );
}