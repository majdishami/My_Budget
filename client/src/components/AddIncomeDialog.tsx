import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Income } from "@/types";
import dayjs from "dayjs";
import { logger } from "@/lib/logger";
import { generateId } from "@/lib/utils";

const formSchema = z.object({
  source: z.string().min(1, "Income source is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  occurrenceType: z.enum(['once', 'weekly', 'monthly', 'biweekly', 'twice-monthly'] as const, {
    required_error: "Please select an occurrence type",
  }),
  firstDate: z.number().min(1).max(31).optional(),
  secondDate: z.number().min(1).max(31).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddIncomeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newIncome: Income) => void;
}

export function AddIncomeDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: AddIncomeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePickers, setShowDatePickers] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: "",
      amount: undefined,
      date: dayjs().format("YYYY-MM-DD"),
      occurrenceType: 'once',
      firstDate: 1,
      secondDate: 15,
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const handleSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      const newIncome: Income = {
        id: generateId(),
        source: values.source,
        amount: values.amount,
        date: dayjs(values.date).toISOString(),
        occurrenceType: values.occurrenceType,
      };

      if (values.occurrenceType === 'twice-monthly') {
        newIncome.firstDate = values.firstDate;
        newIncome.secondDate = values.secondDate;
      }

      await onConfirm(newIncome);
      form.reset();
      onOpenChange(false);
      logger.info("Successfully added new income", { income: newIncome });
    } catch (error) {
      logger.error("Error adding income:", { error });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateDayOptions = () => {
    const days = [];
    for (let i = 1; i <= 31; i++) {
      days.push(
        <SelectItem key={i} value={i.toString()}>
          {i}
        </SelectItem>
      );
    }
    return days;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Income</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter income source"
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter amount"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="occurrenceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setShowDatePickers(value === 'twice-monthly');
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="once">One time</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                      <SelectItem value="twice-monthly">Twice a month</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("occurrenceType") === 'twice-monthly' ? (
              <>
                <FormField
                  control={form.control}
                  name="firstDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First payment day of the month</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {generateDayOptions()}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secondDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Second payment day of the month</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {generateDayOptions()}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || dayjs().format("YYYY-MM-DD")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Income"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}