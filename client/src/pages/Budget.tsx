import { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { Income, Bill } from "@/types";
import { cn } from "@/lib/utils";
import { LeftSidebar } from "@/components/LeftSidebar";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import DailySummaryDialog from "@/components/DailySummaryDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);

type OccurrenceType = 'once' | 'monthly' | 'biweekly' | 'weekly';

const Budget = () => {
  // Initialize with a valid date string
  const today = dayjs('2025-02-03');

  const [isDailySummaryOpen, setDailySummaryOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(today.toDate());
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const [incomeName, setIncomeName] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeOccurrence, setIncomeOccurrence] = useState<OccurrenceType>('once');
  const [incomeStartDate, setIncomeStartDate] = useState<Date>(today.toDate());

  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDueDate, setBillDueDate] = useState<Date>(today.toDate());

  const [incomes, setIncomes] = useState<Income[]>(() => {
    const storedIncomes = localStorage.getItem('incomes');
    if (!storedIncomes) return [];
    try {
      const parsedIncomes = JSON.parse(storedIncomes);
      return parsedIncomes.map((income: any) => ({
        ...income,
        startDate: dayjs(income.startDate).toDate()
      }));
    } catch (e) {
      console.error('Error parsing incomes:', e);
      return [];
    }
  });

  const [bills, setBills] = useState<Bill[]>(() => {
    const storedBills = localStorage.getItem('bills');
    if (!storedBills) return [];
    try {
      const parsedBills = JSON.parse(storedBills);
      return parsedBills.map((bill: any) => ({
        ...bill,
        dueDate: dayjs(bill.dueDate).toDate()
      }));
    } catch (e) {
      console.error('Error parsing bills:', e);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('incomes', JSON.stringify(incomes));
    } catch (e) {
      console.error('Error saving incomes:', e);
    }
  }, [incomes]);

  useEffect(() => {
    try {
      localStorage.setItem('bills', JSON.stringify(bills));
    } catch (e) {
      console.error('Error saving bills:', e);
    }
  }, [bills]);

  const handleAddIncome = () => {
    if (!incomeName || !incomeAmount || !incomeOccurrence || !incomeStartDate) {
      alert("Please fill all income fields");
      return;
    }
    const newIncome: Income = {
      id: crypto.randomUUID(),
      name: incomeName,
      amount: parseFloat(incomeAmount),
      occurrence: incomeOccurrence,
      startDate: incomeStartDate,
    };
    setIncomes([...incomes, newIncome]);
    setIncomeName('');
    setIncomeAmount('');
    setIncomeOccurrence('once');
    setIncomeStartDate(today.toDate());
    setIncomeDialogOpen(false);
  };

  const handleAddBill = () => {
    if (!billName || !billAmount || !billDueDate) {
      alert("Please fill all bill fields");
      return;
    }
    const newBill: Bill = {
      id: crypto.randomUUID(),
      name: billName,
      amount: parseFloat(billAmount),
      dueDate: billDueDate,
    };
    setBills([...bills, newBill]);
    setBillName('');
    setBillAmount('');
    setBillDueDate(today.toDate());
    setBillDialogOpen(false);
  };

  const handleDeleteItem = () => {
    if (deleteItemId) {
      setIncomes(incomes.filter(income => income.id !== deleteItemId));
      setBills(bills.filter(bill => bill.id !== deleteItemId));
      setDeleteItemId(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleOpenDeleteDialog = (id: string) => {
    setDeleteItemId(id);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteItemId(null);
    setDeleteDialogOpen(false);
  };

  const calculateDailyIncome = (date: Date) => {
    const currentDate = dayjs(date);
    let dailyIncome = 0;

    incomes.forEach(income => {
      const startDate = dayjs(income.startDate);

      if (income.occurrence === 'once' && startDate.isSame(currentDate, 'day')) {
        dailyIncome += income.amount;
      } else if (income.occurrence === 'monthly' && startDate.date() === currentDate.date()) {
        dailyIncome += income.amount;
      } else if (income.occurrence === 'biweekly' && 
                currentDate.isSameOrAfter(startDate) && 
                currentDate.diff(startDate, 'day') % 14 === 0) {
        dailyIncome += income.amount;
      } else if (income.occurrence === 'weekly' && 
                currentDate.isSameOrAfter(startDate) && 
                currentDate.diff(startDate, 'day') % 7 === 0) {
        dailyIncome += income.amount;
      }
    });

    return dailyIncome;
  };

  const calculateDailyBills = (date: Date) => {
    const currentDate = dayjs(date);
    let dailyBills = 0;

    bills.forEach(bill => {
      if (dayjs(bill.dueDate).isSame(currentDate, 'day')) {
        dailyBills += bill.amount;
      }
    });

    return dailyBills;
  };

  const getIncomeForDay = (date: Date) => {
    const currentDate = dayjs(date);

    return incomes.filter(income => {
      const startDate = dayjs(income.startDate);

      if (income.occurrence === 'once' && startDate.isSame(currentDate, 'day')) {
        return true;
      } else if (income.occurrence === 'monthly' && startDate.date() === currentDate.date()) {
        return true;
      } else if (income.occurrence === 'biweekly' && 
                currentDate.isSameOrAfter(startDate) && 
                currentDate.diff(startDate, 'day') % 14 === 0) {
        return true;
      } else if (income.occurrence === 'weekly' && 
                currentDate.isSameOrAfter(startDate) && 
                currentDate.diff(startDate, 'day') % 7 === 0) {
        return true;
      }
      return false;
    });
  };

  const getBillsForDay = (date: Date) => {
    const currentDate = dayjs(date);
    return bills.filter(bill => dayjs(bill.dueDate).isSame(currentDate, 'day'));
  };

  const calculateTotalsUpToDay = (date: Date) => {
    const currentDate = dayjs(date);
    let totalIncome = 0;
    let totalBills = 0;

    for (let i = 1; i <= currentDate.date(); i++) {
      const dayDate = currentDate.startOf('month').add(i - 1, 'day').toDate();
      totalIncome += calculateDailyIncome(dayDate);
      totalBills += calculateDailyBills(dayDate);
    }

    return { totalIncome, totalBills };
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setDailySummaryOpen(true);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="border-b">
        <div className="container flex items-center justify-between h-16">
          <LeftSidebar
            incomes={incomes}
            bills={bills}
            onEditTransaction={() => {}}
            onDeleteTransaction={handleOpenDeleteDialog}
            onAddIncome={() => setIncomeDialogOpen(true)}
            onAddBill={() => setBillDialogOpen(true)}
            onReset={() => {}}
          />
          <div className="flex items-center space-x-4">
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="container flex-1 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="flex flex-col p-4">
            <div className="text-lg font-semibold mb-2">Daily Summary</div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  {selectedDate ? format(selectedDate, "MMMM dd, yyyy") : <span>Pick a date</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                />
              </PopoverContent>
            </Popover>
          </Card>

          {/* Add Income Card */}
          <Card className="flex flex-col p-4">
            <div className="text-lg font-semibold mb-2">Add Income</div>
            <Button onClick={() => setIncomeDialogOpen(true)}>Add Income</Button>
          </Card>

          {/* Add Bill Card */}
          <Card className="flex flex-col p-4">
            <div className="text-lg font-semibold mb-2">Add Bill</div>
            <Button onClick={() => setBillDialogOpen(true)}>Add Bill</Button>
          </Card>
        </div>

        <DailySummaryDialog
          isOpen={isDailySummaryOpen}
          onOpenChange={setDailySummaryOpen}
          selectedDay={dayjs(selectedDate).date()}
          dayIncomes={getIncomeForDay(selectedDate)}
          dayBills={getBillsForDay(selectedDate)}
          totalIncomeUpToToday={calculateTotalsUpToDay(selectedDate).totalIncome}
          totalBillsUpToToday={calculateTotalsUpToDay(selectedDate).totalBills}
        />

        {/* Dialog components for add/edit operations */}
         <Dialog open={incomeDialogOpen} onOpenChange={setIncomeDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Income</DialogTitle>
                  <DialogClose><X className="h-4 w-4" /></DialogClose>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label className="text-right text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Name
                    </label>
                    <input type="text"
                      value={incomeName}
                      onChange={(e) => setIncomeName(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-right text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Amount
                    </label>
                    <input type="number"
                      value={incomeAmount}
                      onChange={(e) => setIncomeAmount(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-right text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Occurrence
                    </label>
                    <Select onValueChange={(value) => setIncomeOccurrence(value as OccurrenceType)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">Once</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="biweekly">Biweekly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-right text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Start Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !incomeStartDate && "text-muted-foreground"
                          )}
                        >
                          {incomeStartDate ? format(incomeStartDate, 'MMMM dd, yyyy') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={incomeStartDate}
                          onSelect={(date) => date && setIncomeStartDate(date)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddIncome}>Add Income</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
             <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Bill</DialogTitle>
                  <DialogClose><X className="h-4 w-4" /></DialogClose>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label className="text-right text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Name
                    </label>
                    <input type="text"
                      value={billName}
                      onChange={(e) => setBillName(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-right text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Amount
                    </label>
                    <input type="number"
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-right text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Due Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !billDueDate && "text-muted-foreground"
                          )}
                        >
                          {billDueDate ? format(billDueDate, 'MMMM dd, yyyy') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={billDueDate}
                          onSelect={(date) => date && setBillDueDate(date)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddBill}>Add Bill</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        <Card className="mt-6 p-4">
          <div className="text-lg font-semibold mb-4">Income</div>
          {incomes.length === 0 ? (
            <div className="text-center text-gray-500">No income added yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Amount</th>
                    <th className="px-4 py-2 text-left">Occurrence</th>
                    <th className="px-4 py-2 text-left">Start Date</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incomes.map((income) => (
                    <tr key={income.id} className="border-b">
                      <td className="px-4 py-2">{income.name}</td>
                      <td className="px-4 py-2">{income.amount}</td>
                      <td className="px-4 py-2">{income.occurrence}</td>
                      <td className="px-4 py-2">{format(income.startDate, 'MMMM dd, yyyy')}</td>
                      <td className="px-4 py-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDeleteDialog(income.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card className="mt-6 p-4">
          <div className="text-lg font-semibold mb-4">Bills</div>
          {bills.length === 0 ? (
            <div className="text-center text-gray-500">No bills added yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Amount</th>
                    <th className="px-4 py-2 text-left">Due Date</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
                    <tr key={bill.id} className="border-b">
                      <td className="px-4 py-2">{bill.name}</td>
                      <td className="px-4 py-2">{bill.amount}</td>
                      <td className="px-4 py-2">{format(bill.dueDate, 'MMMM dd, yyyy')}</td>
                      <td className="px-4 py-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDeleteDialog(bill.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCloseDeleteDialog}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteItem}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Budget;