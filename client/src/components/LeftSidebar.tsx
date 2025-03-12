import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Income, Bill } from "@/types";
import { logger } from "@/lib/logger";
import {
  Plus,
  Edit,
  Trash,
  Menu,
  RefreshCw,
  LayoutDashboard,
} from "lucide-react";
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
import dayjs from "dayjs";
import { useState, useMemo } from "react";

interface LeftSidebarProps {
  incomes: Income[];
  bills: Bill[];
  onEditTransaction: (type: 'income' | 'bill', data: Income | Bill) => void;
  onDeleteTransaction: (type: 'income' | 'bill', data: Income | Bill) => void;
  onAddIncome: () => void;
  onAddBill: () => void;
  onReset: () => void;
}

export function LeftSidebar({
  incomes,
  bills,
  onEditTransaction,
  onDeleteTransaction,
  onAddIncome,
  onAddBill,
  onReset,
}: LeftSidebarProps) {
  const [location] = useLocation();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<{ type: 'income' | 'bill', data: Income | Bill } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Memoize sorted bills
  const sortedBills = useMemo(() => {
    return [...bills].sort((a, b) => b.amount - a.amount);
  }, [bills]);

  // Function to format the date display for incomes
  const formatIncomeDisplay = (income: Income) => {
    const frequencyMap: Record<string, string> = {
      "twice-monthly": "Twice Monthly",
      "biweekly": "Bi-Weekly",
      "monthly": "Monthly",
      "weekly": "Weekly",
    };

    return income.source === "Majdi's Salary"
      ? "Twice Monthly"
      : income.source === "Ruba's Salary"
      ? "Bi-Weekly"
      : frequencyMap[income.occurrenceType] || "One Time";
  };

  // Handle delete request
  const handleDeleteRequest = (type: 'income' | 'bill', data: Income | Bill) => {
    logger.info("[LeftSidebar] Delete request:", { type, data });
    if (!data || !data.id) {
      logger.error("[LeftSidebar] Invalid transaction data:", data);
      return;
    }
    setDeletingTransaction({ type, data });
    setIsDeleteConfirmOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (deletingTransaction) {
      if (!deletingTransaction.data?.id) {
        logger.error("[LeftSidebar] No transaction selected for deletion.");
        return;
      }
      logger.info("[LeftSidebar] Confirming deletion:", deletingTransaction);
      onDeleteTransaction(deletingTransaction.type, deletingTransaction.data);
      setIsDeleteConfirmOpen(false);
      setDeletingTransaction(null);
    }
  };

  return (
    <div className="relative">
      {/* Top Menu Navigation */}
      <div className="fixed left-0 top-0 h-full w-64 bg-background shadow-md overflow-y-auto" z-50 w-full bg-background p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <LayoutDashboard className="h-5 w-5" />
            </Button>
          </Link>
          <h2 className="text-lg font-semibold">Budget Tracker</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onReset}
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Sidebar Content */}
      <div className="mt-20 p-4 space-y-6">
        {/* Income Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Incomes</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onAddIncome}
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {incomes.map((income, index) => (
              <div
                key={income.id ?? `income-${index}`}
                className="flex items-center justify-between p-2 hover:bg-accent rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {index + 1}. {income.source}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatIncomeDisplay(income)} - {formatCurrency(income.amount)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEditTransaction('income', income)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteRequest('income', income)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bills Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Bills</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onAddBill}
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {sortedBills.map((bill, index) => (
              <div
                key={bill.id ?? `bill-${index}`}
                className="flex items-center justify-between p-2 hover:bg-accent rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {index + 1}. {bill.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Day {bill.day} - {formatCurrency(bill.amount)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEditTransaction('bill', bill)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteRequest('bill', bill)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reset Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={onReset}
        >
          Reset Data
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deletingTransaction?.type === 'income' ? 'Delete Income' : 'Delete Bill'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTransaction?.type === 'income' ? (
                <>
                  Are you sure you want to delete this income?
                  <div className="mt-2 text-sm">
                    <p>Source: {(deletingTransaction?.data as Income).source}</p>
                    <p>Amount: {formatCurrency((deletingTransaction?.data as Income).amount)}</p>
                    <p>Frequency: {formatIncomeDisplay(deletingTransaction?.data as Income)}</p>
                  </div>
                </>
              ) : (
                <>
                  Are you sure you want to delete this bill?
                  <div className="mt-2 text-sm">
                    <p>Name: {(deletingTransaction?.data as Bill).name}</p>
                    <p>Amount: {formatCurrency((deletingTransaction?.data as Bill).amount)}</p>
                    <p>Due Date: Day {(deletingTransaction?.data as Bill).day} of each month</p>
                  </div>
                </>
              )}
              <p className="mt-2 font-semibold">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
