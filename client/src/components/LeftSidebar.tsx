import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Income, Bill } from "../types";
import { Pencil, Trash2, Plus, RefreshCw, FileText } from "lucide-react";

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

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <nav className="grid gap-1">
          <Link href="/">
            <Button
              variant={location === "/" ? "default" : "ghost"}
              className="w-full justify-start"
            >
              Budget Overview
            </Button>
          </Link>
          <Link href="/reports">
            <Button
              variant={location === "/reports" ? "default" : "ghost"}
              className="w-full justify-start"
            >
              <FileText className="mr-2 h-4 w-4" />
              Report Generation
            </Button>
          </Link>
        </nav>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Default Income/Bills</h2>
        <div className="grid gap-1">
          {/* Load Default button will be implemented later */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onReset}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Load Default
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Income Sources</h2>
        <div className="grid gap-1">
          {incomes.map((income) => (
            <Card key={income.id} className="p-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{income.source}</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditTransaction('income', income)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteTransaction('income', income)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onAddIncome}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Income
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Bills</h2>
        <div className="grid gap-1">
          {bills.map((bill) => (
            <Card key={bill.id} className="p-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{bill.name}</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditTransaction('bill', bill)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteTransaction('bill', bill)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onAddBill}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Bill
          </Button>
        </div>
      </div>
    </div>
  );
}