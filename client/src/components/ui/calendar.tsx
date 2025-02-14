import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Bill, Income } from "@/types"
import { DayContent } from "@/components/DayContent"
import { logger } from "@/lib/logger"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  bills?: Bill[];
  incomes?: Income[];
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  bills = [],
  incomes = [],
  ...props
}: CalendarProps) {
  // Generate a more detailed key that changes when transaction details change
  const transactionKey = React.useMemo(() => {
    const billsKey = bills.map(b => `${b.id}-${b.name}-${b.amount}-${b.date}`).join('|');
    const incomesKey = incomes.map(i => `${i.id}-${i.source}-${i.amount}-${i.date}`).join('|');
    const key = `${billsKey}:${incomesKey}`;
    logger.info('Calendar transaction key updated:', { key });
    return key;
  }, [bills, incomes]);

  // Log when the calendar renders with new transactions
  React.useEffect(() => {
    logger.info('Calendar rendered with transactions:', { 
      billsCount: bills.length,
      incomesCount: incomes.length,
      transactionKey
    });
  }, [bills, incomes, transactionKey]);

  return (
    <DayPicker
      key={transactionKey}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background hover:bg-accent hover:text-accent-foreground h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn(
          "relative h-9 w-9 text-center text-sm p-0",
          "[&:has([aria-selected].day-range-end)]:rounded-r-md",
          "[&:has([aria-selected].day-outside)]:bg-accent/50",
          "[&:has([aria-selected])]:bg-accent",
          "first:[&:has([aria-selected])]:rounded-l-md",
          "last:[&:has([aria-selected])]:rounded-r-md",
          "focus-within:relative focus-within:z-20"
        ),
        day: cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        DayContent: ({ date, ...contentProps }) => (
          <DayContent 
            key={`${date.toISOString()}-${transactionKey}`}
            day={date} 
            bills={bills} 
            incomes={incomes} 
            {...contentProps} 
          />
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }