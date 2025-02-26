// Import necessary libraries and components
import { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs"; // Library for date manipulation
import isBetween from "dayjs/plugin/isBetween"; // Plugin for checking if a date is between two dates
import { Income, Bill } from "./types"; // Import types for Income and Bill
import { cn } from "@/lib/utils"; // Utility function for className manipulation
import { LeftSidebar } from "@/components/LeftSidebar"; // Left sidebar component
import { Card } from "@/components/ui/card"; // UI Card component
import { ThemeToggle } from "@/components/ThemeToggle"; // Theme toggle component
import { DailySummaryDialog } from "@/components/DailySummaryDialog"; // Dialog for daily summary
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog"; // Dialog components for modals
import { X } from "lucide-react"; // Icon for closing dialogs
import { Button } from "@/components/ui/button"; // Button component
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Components for alert dialogs
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Components for dropdown selection
import { Calendar } from "@/components/ui/calendar"; // Calendar component
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Components for popover
import { Calendar as CalendarIcon } from "lucide-react"; // Calendar icon
import { format } from "date-fns"; // Date formatting library

// Extend dayjs with the isBetween plugin to handle date comparisons
dayjs.extend(isBetween);

// Define the types of occurrences for income
type OccurrenceType = 'once' | 'monthly' | 'biweekly' | 'weekly';

// Function to format currency values
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Main App component
const App = () => {
  // Set today to February 2nd, 2025 for testing purposes
  // Explicitly set the month to 1 for February (0-based months in JavaScript)
  const today = dayjs('2025-02-02');
  const [selectedYear, setSelectedYear] = useState(today.year());
  // Ensure month is handled correctly (February is 1 in 0-based month system)
  const [selectedMonth, setSelectedMonth] = useState(1); // Explicitly set to February
  const [selectedDay, setSelectedDay] = useState<number>(today.date());
  const [showDayDialog, setShowDayDialog] = useState(false);
  const [incomes, setIncomes] = useState<Income[]>([]); // State to manage income records
  const [bills, setBills] = useState<Bill[]>([]); // State to manage bill records
  const [editingBill, setEditingBill] = useState<Bill | null>(null); // State for editing a bill
  const [showEditDialog, setShowEditDialog] = useState(false); // Dialog state for editing bill
  const [showAddBillDialog, setShowAddBillDialog] = useState(false); // Dialog state for adding a bill
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null); // State for deleting a bill
  const [showDeleteDialog, setShowDeleteDialog] = useState(false); // Dialog state for deleting bill confirmation
  const [editingIncome, setEditingIncome] = useState<Income | null>(null); // State for editing an income
  const [showEditIncomeDialog, setShowEditIncomeDialog] = useState(false); // Dialog state for editing income
  const [showAddIncomeDialog, setShowAddIncomeDialog] = useState(false); // Dialog state for adding income
  const [deletingIncome, setDeletingIncome] = useState<Income | null>(null); // State for deleting income
  const [showDeleteIncomeDialog, setShowDeleteIncomeDialog] = useState(false); // Dialog state for deleting income confirmation
  const [addIncomeDate, setAddIncomeDate] = useState<Date>(new Date()); // State for adding income date
  const [showDailySummary, setShowDailySummary] = useState(false); // Dialog state for daily summary

  // Function to close the daily summary dialog
  const closeSummary = () => {
    setShowDayDialog(false);
  };

  // Effect to load income and bill data from localStorage
  useEffect(() => {
    // Clear existing data first
    localStorage.removeItem("incomes");
    localStorage.removeItem("bills");

    const storedIncomes = localStorage.getItem("incomes"); // Get stored incomes
    const storedBills = localStorage.getItem("bills"); // Get stored bills

    // Default incomes if none exist in localStorage
    if (!storedIncomes) {
      const today = dayjs(); // Get current date
      const sampleIncomes: Income[] = [
        { id: "1", source: "Majdi's Salary", amount: 4739.00, date: today.date(1).toISOString() },
        { id: "2", source: "Majdi's Salary", amount: 4739.00, date: today.date(15).toISOString() },
        { id: "3", source: "Ruba's Salary", amount: 2168.00, date: "2025-01-10" } // Only need one entry for Ruba's salary
      ];
      setIncomes(sampleIncomes); // Set default incomes
      localStorage.setItem("incomes", JSON.stringify(sampleIncomes)); // Store default incomes in localStorage
    } else {
      setIncomes(JSON.parse(storedIncomes)); // Parse and set stored incomes
    }

    // Default bills if none exist in localStorage
    if (!storedBills) {
      const sampleBills: Bill[] = [
        { id: "1", name: "ATT Phone Bill ($115 Rund Roaming)", amount: 429.00, day: 1 },
        { id: "2", name: "Maid's 1st payment", amount: 120.00, day: 1 },
        { id: "3", name: "Monthly Rent", amount: 3750.00, day: 1 },
        { id: "4", name: "Sling TV (CC 9550)", amount: 75.00, day: 3 },
        { id: "5", name: "Cox Internet", amount: 81.00, day: 6 },
        { id: "6", name: "Water Bill", amount: 80.00, day: 7 },
        { id: "7", name: "NV Energy Electrical ($100 winter months)", amount: 250.00, day: 7 },
        { id: "8", name: "TransAmerica Life Insurance", amount: 77.00, day: 9 },
        { id: "9", name: "Credit Card minimum payments", amount: 225.00, day: 14 },
        { id: "10", name: "Apple/Google/YouTube (CC 9550)", amount: 130.00, day: 14 },
        { id: "11", name: "Expenses & Groceries charged on (CC 2647)", amount: 3000.00, day: 16 },
        { id: "12", name: "Maid's 2nd Payment of the month", amount: 120.00, day: 17 },
        { id: "13", name: "SoFi Personal Loan", amount: 1915.00, day: 17 },
        { id: "14", name: "Southwest Gas ($200 in winter/$45 in summer)", amount: 75.00, day: 17 },
        { id: "15", name: "Car Insurance for 3 cars ($268 + $169 + $303 + $21)", amount: 704.00, day: 28 }
      ];
      setBills(sampleBills); // Set default bills
      localStorage.setItem("bills", JSON.stringify(sampleBills)); // Store default bills in localStorage
    } else {
      setBills(JSON.parse(storedBills)); // Parse and set stored bills
    }
  }, []); // Run once on component mount

  // Function to get income for a specific day
  const getIncomeForDay = (day: number) => {
    if (day <= 0 || day > daysInMonth) return []; // Return empty if day is invalid

    const currentDate = dayjs()
      .year(selectedYear)
      .month(selectedMonth)
      .date(day); // Create date object for the specified day

    return incomes.filter(income => {
      const incomeDate = dayjs(income.date); // Parse income date

      // Special case for Ruba's salary which is bi-weekly
      if (income.source === "Ruba's Salary") {
        // Check if it's a Friday (5 in dayjs)
        if (currentDate.day() !== 5) return false; // Ruba's salary only on Fridays

        const startDate = dayjs('2025-01-10'); // Start bi-weekly calculation from this date
        const weeksDiff = currentDate.diff(startDate, 'week'); // Calculate weeks difference

        // Return true if it's a bi-weekly Friday from the start date
        return weeksDiff >= 0 && weeksDiff % 2 === 0;
      }

      // For other incomes, check if the day matches
      return incomeDate.date() === day;
    });
  };

  // Function to get bills for a specific day
  const getBillsForDay = (day: number) => {
    if (day <= 0 || day > daysInMonth) return []; // Return empty if day is invalid

    return bills.filter(bill => {
      if (bill.isYearly && bill.yearly_date) {
        // For yearly bills, check if the month and day match
        const yearlyDate = dayjs(bill.yearly_date);
        return yearlyDate.month() === selectedMonth - 1 && yearlyDate.date() === day;
      } else if (bill.isOneTime && bill.date) {
        // For one-time bills, check exact date match
        const billDate = dayjs(bill.date);
        return billDate.year() === selectedYear && 
               billDate.month() === selectedMonth - 1 && 
               billDate.date() === day;
      } else {
        // For monthly bills, just check the day
        return bill.day === day;
      }
    });
  };

  // Memoization for performance optimization
  const firstDayOfMonth = useMemo(() => {
    return dayjs(`${selectedYear}-${(selectedMonth).toString().padStart(2, '0')}-01`); // Get the first day of the selected month
  }, [selectedYear, selectedMonth]);

  const daysInMonth = useMemo(() => {
    return firstDayOfMonth.daysInMonth(); // Get the total number of days in the selected month
  }, [firstDayOfMonth]);

  const firstDayOfWeek = useMemo(() => {
    // Calculate the first day of the week for the selected month
    const day = firstDayOfMonth.day();
    return day === 0 ? 6 : day - 1; // Adjust for Sunday
  }, [firstDayOfMonth]);

  // Function to calculate totals up to a specific day
  const calculateTotalsUpToDay = (day: number) => {
    let totalIncome = 0; // Initialize income total
    let totalBills = 0; // Initialize bills total

    // Calculate for each day up to the selected day
    for (let currentDay = 1; currentDay <= day; currentDay++) {
      // Add incomes for the day
      const dayIncomes = getIncomeForDay(currentDay);
      totalIncome += dayIncomes.reduce((sum, income) => sum + income.amount, 0); // Sum income amounts

      // Add bills for the day
      const dayBills = getBillsForDay(currentDay);
      totalBills += dayBills.reduce((sum, bill) => sum + bill.amount, 0); // Sum bill amounts
    }

    return { totalIncome, totalBills }; // Return the totals
  };


  const isCurrentDay = (day: number) => {
    const currentDate = dayjs(); // Get current date
    return day === currentDate.date() && selectedMonth - 1 === currentDate.month() && selectedYear === currentDate.year(); // Check if it matches
  };

  // Generate calendar days based on the selected month
  const calendarDays = useMemo(() => {
    const totalDays = 42; // Calculate for 6 weeks and 7 days
    return Array.from({ length: totalDays }, (_, index) => {
      const adjustedIndex = index - firstDayOfWeek; // Adjust index for first day of the week
      return adjustedIndex >= 0 && adjustedIndex < daysInMonth ? adjustedIndex + 1 : null; // Return valid days or null
    });
  }, [daysInMonth, firstDayOfWeek]);

  // Calculate monthly totals for income and bills
  const monthlyTotals = useMemo(() => {
    let totalIncome = 0; // Initialize income total
    let totalBills = 0; // Initialize bills total

    // Calculate total income for the selected month
    incomes.forEach(income => {
      const incomeDate = dayjs(income.date); // Parse income date

      // Special case for Ruba's salary which is bi-weekly
      if (income.source === "Ruba's Salary") {
        const firstDayOfMonth = dayjs().year(selectedYear).month(selectedMonth - 1).startOf('month'); // Get first day of month
        const lastDayOfMonth = firstDayOfMonth.endOf('month'); // Get last day of month
        const startDate = dayjs('2025-01-10'); // Start bi-weekly calculation from this date

        // Iterate through each day in the month
        let currentDate = firstDayOfMonth;
        while (currentDate.isBefore(lastDayOfMonth) || currentDate.isSame(lastDayOfMonth, 'day')) {
          // Check if it's a Friday and matches bi-weekly schedule
          if (currentDate.day() === 5) { // Friday
            const weeksDiff = currentDate.diff(startDate, 'week'); // Calculate weeks difference
            if (weeksDiff >= 0 && weeksDiff % 2 === 0) {
              totalIncome += income.amount; // Add income for valid payday
            }
          }
          currentDate = currentDate.add(1, 'day'); // Move to next day
        }
      } else { // For regular monthly incomes
        const incomeYear = incomeDate.year(); // Get year of income
        const incomeMonth = incomeDate.month(); // Get month of income
        const incomeDay = incomeDate.date(); // Get day of income

        // Create a new date with the selected year/month but same day
        const adjustedDate = dayjs()
          .year(selectedYear)
          .month(selectedMonth - 1)
          .date(incomeDay);

        // Only count if the day exists in the current month
        if (adjustedDate.month() === selectedMonth - 1) {
          totalIncome += income.amount; // Add income amount
        }
      }
    });

    // Calculate total bills for the selected month
    bills.forEach(bill => {
      totalBills += bill.amount; // Sum bill amounts
    });

    return {
      totalIncome,
      totalBills,
      balance: totalIncome - totalBills // Calculate balance
    };
  }, [incomes, bills, selectedMonth, selectedYear]);

  // Function to handle editing a transaction
  const handleEditTransaction = (type: 'income' | 'bill', data: Income | Bill) => {
    if (type === 'income') {
      setEditingIncome(data as Income); // Set the income to edit
      setShowEditIncomeDialog(true); // Open edit income dialog
    } else if (type === 'bill') {
      setEditingBill(data as Bill); // Set the bill to edit
      setShowEditDialog(true); // Open edit bill dialog
    }
  };

  // Function to handle deleting a transaction
  const handleDeleteTransaction = (type: 'income' | 'bill', data: Income | Bill) => {
    if (type === 'income') {
      setDeletingIncome(data as Income); // Set the income to delete
      setShowDeleteIncomeDialog(true); // Open delete income confirmation dialog
    } else {
      setDeletingBill(data as Bill); // Set the bill to delete
      setShowDeleteDialog(true); // Open delete bill confirmation dialog
    }
  };

  // Function to confirm deletion of a bill
  const confirmDelete = () => {
    if (deletingBill) {
      const newBills = bills.filter(b => b.id !== deletingBill.id); // Filter out the deleted bill
      setBills(newBills); // Update bills state
      localStorage.setItem("bills", JSON.stringify(newBills)); // Update localStorage
      setShowDeleteDialog(false); // Close delete confirmation dialog
      setDeletingBill(null); // Clear deletingBill state
    }
  };

  // Function to confirm deletion of an income
  const confirmIncomeDelete = () => {
    if (deletingIncome) {
      const newIncomes = incomes.filter(i => i.id !== deletingIncome.id); // Filter out the deleted income
      setIncomes(newIncomes); // Update incomes state
      localStorage.setItem("incomes", JSON.stringify(newIncomes)); // Update localStorage
      setShowDeleteIncomeDialog(false); // Close delete confirmation dialog
      setDeletingIncome(null); // Clear deletingIncome state
    }
  };

  // Function to handle adding income
  const handleAddIncome = () => {
    setAddIncomeDate(new Date()); // Set the date for the new income
    setShowAddIncomeDialog(true); // Open add income dialog
  };

  // Function to handle adding a bill
  const handleAddBill = () => {
    setShowAddBillDialog(true); // Open add bill dialog
  };

  // Function to reset all data
  const handleReset = () => {
    localStorage.clear(); // Clear localStorage
    window.location.reload(); // Refresh the page
  };

  // Generate years for the year selection dropdown
  const years = useMemo(() => {
    const currentYear = today.year(); // Get current year
    return Array.from({ length: 21 }, (_, i) => currentYear - 10 + i); // Create an array of years
  }, [today]);

  // Generate months for the month selection dropdown
  const months = useMemo(() => (
    Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: dayjs().month(i).format("MMMM") // Format month names
    }))
  ), []);

  // Function to handle month change
  const handleMonthChange = (newMonth: number) => {
    setSelectedMonth(newMonth + 1); // Update selected month
    setSelectedDay(1); // Reset to the first day of new month
  };

  // Function to handle year change
  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear); // Update selected year
    setSelectedDay(1); // Reset to the first day of new year
  };

  // Render the main application UI
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left sidebar for navigating between incomes and bills */}
      <aside className="w-56 border-r p-2 bg-muted/30 fixed top-0 bottom-0 overflow-y-auto">
        <LeftSidebar
          incomes={incomes}
          bills={bills}
          onEditTransaction={handleEditTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onAddIncome={handleAddIncome}
          onAddBill={handleAddBill}
          onReset={handleReset}
        />
      </aside>

      {/* Main content area */}
      <main className="ml-56 flex-1 flex flex-col h-screen overflow-hidden min-w-[900px]">
        <Card className="p-4 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">
                My Budget - {dayjs().month(selectedMonth - 1).format("MMMM")} {selectedYear}
              </h1>
              <div className="flex items-center gap-2">
                {/* Month selection dropdown */}
                <select
                  value={selectedMonth - 1}
                  onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                  className="p-2 border rounded bg-background min-w-[120px]"
                  aria-label="Select month"
                >
                  {months.map((month, index) => (
                    <option key={index} value={index}>
                      {month.label}
                    </option>
                  ))}
                </select>

                {/* Year selection dropdown */}
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(parseInt(e.target.value))}
                  className="p-2 border rounded bg-background min-w-[100px]"
                  aria-label="Select year"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                {/* Day selection dropdown */}
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                  className="p-2 border rounded bg-background min-w-[80px]"
                  aria-label="Select day"
                >
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>
                      {day.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <ThemeToggle /> {/* Component to toggle between light and dark themes */}
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(monthlyTotals.totalIncome)} {/* Display total income */}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Bills</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(monthlyTotals.totalBills)} {/* Display total bills */}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Balance</p>
                <p className={`text-lg font-semibold ${
                  monthlyTotals.balance >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {formatCurrency(monthlyTotals.balance)} {/* Display net balance */}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Render the calendar for the selected month */}
        <div className="flex-1 overflow-y-auto">
          <Calendar
            mode="single"
            selected={new Date(selectedYear, selectedMonth - 1, selectedDay)}
            month={new Date(selectedYear, selectedMonth - 1, 1)}
            onSelect={(date) => {
              if (date) {
                setSelectedDay(date.getDate());
                setSelectedMonth(date.getMonth() + 1);
                setSelectedYear(date.getFullYear());
              }
            }}
            onMonthChange={(date) => {
              if (date) {
                setSelectedMonth(date.getMonth() + 1);
                setSelectedYear(date.getFullYear());
              }
            }}
            onDayClick={(date) => {
              if (date) {
                setSelectedDay(date.getDate());
                setSelectedMonth(date.getMonth() + 1);
                setSelectedYear(date.getFullYear());
                setShowDailySummary(true);
              }
            }}
            className="rounded-md border m-4"
            bills={bills}
            incomes={incomes}
          />
        </div>
      </main>

      {/* Daily Summary Dialog */}
      <DailySummaryDialog
        isOpen={showDailySummary}
        onOpenChange={setShowDailySummary}
        selectedDay={selectedDay}
        selectedMonth={selectedMonth - 1} // Pass the correct month value
        selectedYear={selectedYear}
        dayIncomes={getIncomeForDay(selectedDay)}
        dayBills={getBillsForDay(selectedDay)}
        totalIncomeUpToToday={calculateTotalsUpToDay(selectedDay).totalIncome}
        totalBillsUpToToday={calculateTotalsUpToDay(selectedDay).totalBills}
        monthlyTotals={{
          income: monthlyTotals.totalIncome,
          expenses: monthlyTotals.totalBills
        }}
      />
    </div>
  );
};

export default App;