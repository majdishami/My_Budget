import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

interface Transaction {
  date: string;
  description: string;
  amount: number;
  occurred: boolean;
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  day: number;
}

interface ExpenseReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bills: Bill[];
}

export default function ExpenseReportDialog({ isOpen, onOpenChange, bills }: ExpenseReportDialogProps) {
  const [selectedBillId, setSelectedBillId] = useState<string | undefined>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const today = dayjs('2025-02-04'); // Current date

  useEffect(() => {
    if (!isOpen) {
      setSelectedBillId(undefined);
      setTransactions([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedBillId) return;

    const selectedBill = bills.find(bill => bill.id === selectedBillId);
    if (!selectedBill) return;

    const mockTransactions: Transaction[] = [];
    const startDate = today.startOf('year');
    const endDate = today.endOf('year');
    let currentMonth = startDate.startOf('month');

    while (currentMonth.isSameOrBefore(endDate)) {
      const transactionDate = currentMonth.date(selectedBill.day);
      mockTransactions.push({
        date: transactionDate.format('YYYY-MM-DD'),
        description: selectedBill.name,
        amount: selectedBill.amount,
        occurred: transactionDate.isSameOrBefore(today)
      });
      currentMonth = currentMonth.add(1, 'month');
    }

    setTransactions(mockTransactions);
  }, [selectedBillId, bills, today]);

  // Group transactions by month
  const groupedTransactions = transactions.reduce((groups: Record<string, Transaction[]>, transaction) => {
    const monthKey = dayjs(transaction.date).format('YYYY-MM');
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(transaction);
    return groups;
  }, {});

  // Sort month keys
  const sortedMonths = Object.keys(groupedTransactions).sort();

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const occurredAmount = transactions.filter(t => t.occurred).reduce((sum, t) => sum + t.amount, 0);
  const pendingAmount = totalAmount - occurredAmount;

  if (!selectedBillId) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Select Expense</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-4">
            <Select onValueChange={setSelectedBillId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an expense" />
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
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedBill = bills.find(b => b.id === selectedBillId)!;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Expense Report: {selectedBill.name}
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Total Annual Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalAmount)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Paid to Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(occurredAmount)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Remaining This Year</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-300">
                {formatCurrency(pendingAmount)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Grouped Transactions */}
        <div className="space-y-4">
          {sortedMonths.map(monthKey => {
            const monthTransactions = groupedTransactions[monthKey];
            const monthlyTotal = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

            return (
              <Card key={monthKey}>
                <CardHeader className="py-4">
                  <CardTitle className="text-lg font-medium">
                    {dayjs(monthKey).format('MMMM YYYY')}
                  </CardTitle>
                  <div className="text-sm space-y-1">
                    <div className="text-red-600">
                      Monthly Cost: {formatCurrency(monthlyTotal)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthTransactions
                        .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
                        .map((transaction, index) => (
                          <TableRow key={index}>
                            <TableCell>{dayjs(transaction.date).format('MMM D, YYYY')}</TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell className={`text-right ${transaction.occurred ? 'text-red-600' : 'text-red-300'}`}>
                              {formatCurrency(transaction.amount)}
                            </TableCell>
                            <TableCell className={transaction.occurred ? 'text-red-600' : 'text-red-300'}>
                              {transaction.occurred ? 'Paid' : 'Pending'}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
