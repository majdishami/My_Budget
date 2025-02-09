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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Income } from "@/types";
import dayjs from "dayjs";

type OccurrenceType = 'once' | 'monthly' | 'biweekly' | 'twice-monthly';

const formSchema = z.object({
  source: z.string().min(1, "Income source is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  occurrenceType: z.enum(['once', 'monthly', 'biweekly', 'twice-monthly'] as const),
  date: z.date({
    required_error: "Please select a date",
    invalid_type_error: "Invalid date format",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface AddIncomeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newIncome: Omit<Income, 'id'> & { occurrenceType: OccurrenceType }) => void;
}

export function AddIncomeDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: AddIncomeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const minSelectableDate = new Date();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: '',
      amount: undefined,
      occurrenceType: 'once',
      date: new Date(),
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const handleSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      await onConfirm({
        source: values.source,
        amount: values.amount,
        date: dayjs(values.date).toISOString(),
        occurrenceType: values.occurrenceType,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting income:', error);
    } finally {
      setIsSubmitting(false);
    }
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
                      aria-label="Income source"
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
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      aria-label="Income amount"
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
                  <FormLabel>Occurrence</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select occurrence type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="once">Once</SelectItem>
                      <SelectItem value="monthly">Once a month</SelectItem>
                      <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                      <SelectItem value="twice-monthly">Twice a month</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          aria-label="Select date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < minSelectableDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

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