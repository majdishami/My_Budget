import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Income, Bill } from "@/types";
import { 
  Plus, 
  RefreshCw, 
  FileText, 
  Calendar,
  ChartBar,
  FileBarChart,
  Edit,
  Trash
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  return (
    <div className="space-y-6">
      {/* Expenses Section */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold px-2">Expenses</h2>
        <div className="space-y-2">
          <Select onValueChange={(value) => {
            const bill = bills.find(b => b.id === value);
            if (bill) onEditTransaction('bill', bill);
          }}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Edit className="mr-2 h-4 w-4" />
              Edit Expense
            </Button>
            <SelectContent>
              {bills.map((bill) => (
                <SelectItem key={bill.id} value={bill.id}>
                  {bill.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={onAddBill}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>

          <Select onValueChange={(value) => {
            const bill = bills.find(b => b.id === value);
            if (bill) onDeleteTransaction('bill', bill);
          }}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Trash className="mr-2 h-4 w-4" />
              Delete Expense
            </Button>
            <SelectContent>
              {bills.map((bill) => (
                <SelectItem key={bill.id} value={bill.id}>
                  {bill.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Income Section */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold px-2">Income</h2>
        <div className="space-y-2">
          <Select onValueChange={(value) => {
            const income = incomes.find(i => i.id === value);
            if (income) onEditTransaction('income', income);
          }}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Edit className="mr-2 h-4 w-4" />
              Edit Income
            </Button>
            <SelectContent>
              {incomes.map((income) => (
                <SelectItem key={income.id} value={income.id}>
                  {income.source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={onAddIncome}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Income
          </Button>

          <Select onValueChange={(value) => {
            const income = incomes.find(i => i.id === value);
            if (income) onDeleteTransaction('income', income);
          }}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Trash className="mr-2 h-4 w-4" />
              Delete Income
            </Button>
            <SelectContent>
              {incomes.map((income) => (
                <SelectItem key={income.id} value={income.id}>
                  {income.source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reports Section */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold px-2">Reports</h2>
        <div className="space-y-2">
          <Link href="/reports/monthly-to-date">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Monthly up today
            </Button>
          </Link>
          <Link href="/reports/monthly">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <ChartBar className="mr-2 h-4 w-4" />
              Monthly Report
            </Button>
          </Link>
          <Link href="/reports/date-range">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <FileBarChart className="mr-2 h-4 w-4" />
              Date Range Report
            </Button>
          </Link>
          <Link href="/reports/income">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <FileText className="mr-2 h-4 w-4" />
              Income Report
            </Button>
          </Link>
          <Link href="/reports/expenses">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <FileText className="mr-2 h-4 w-4" />
              Expenses Report
            </Button>
          </Link>
        </div>
      </div>

      {/* Reset Section */}
      <div className="pt-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={onReset}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}