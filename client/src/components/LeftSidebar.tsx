import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Income, Bill } from "@/types";
import { 
  Pencil, 
  Trash2, 
  Plus, 
  RefreshCw, 
  FileText, 
  Calendar,
  ChartBar,
  FileBarChart
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
      <Accordion type="single" defaultValue="income" className="w-full">
        {/* Income Section */}
        <AccordionItem value="income">
          <AccordionTrigger className="text-lg font-semibold">Income</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {/* Edit Income */}
              <div className="space-y-2">
                <Select onValueChange={(value) => {
                  const income = incomes.find(i => i.id === value);
                  if (income) onEditTransaction('income', income);
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Edit Income" />
                  </SelectTrigger>
                  <SelectContent>
                    {incomes.map((income) => (
                      <SelectItem key={income.id} value={income.id}>
                        {income.source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add Income */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onAddIncome}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Income
              </Button>

              {/* Delete Income */}
              <div className="space-y-2">
                <Select onValueChange={(value) => {
                  const income = incomes.find(i => i.id === value);
                  if (income) onDeleteTransaction('income', income);
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Delete Income" />
                  </SelectTrigger>
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
          </AccordionContent>
        </AccordionItem>

        {/* Expenses Section */}
        <AccordionItem value="expenses">
          <AccordionTrigger className="text-lg font-semibold">Expenses</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {/* Edit Bill */}
              <div className="space-y-2">
                <Select onValueChange={(value) => {
                  const bill = bills.find(b => b.id === value);
                  if (bill) onEditTransaction('bill', bill);
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Edit Expense" />
                  </SelectTrigger>
                  <SelectContent>
                    {bills.map((bill) => (
                      <SelectItem key={bill.id} value={bill.id}>
                        {bill.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add Bill */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onAddBill}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>

              {/* Delete Bill */}
              <div className="space-y-2">
                <Select onValueChange={(value) => {
                  const bill = bills.find(b => b.id === value);
                  if (bill) onDeleteTransaction('bill', bill);
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Delete Expense" />
                  </SelectTrigger>
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
          </AccordionContent>
        </AccordionItem>

        {/* Reports Section */}
        <AccordionItem value="reports">
          <AccordionTrigger className="text-lg font-semibold">Reports</AccordionTrigger>
          <AccordionContent>
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Reset Section */}
      <div className="pt-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onReset}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}