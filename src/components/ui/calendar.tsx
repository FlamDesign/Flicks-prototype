import * as React from "react"
import { DayPicker, getDefaultClassNames, type DayButton } from "react-day-picker"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

/** shadcn Calendar (react-day-picker v9), in the app's theme. */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  buttonVariant = "ghost",
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & { buttonVariant?: React.ComponentProps<typeof Button>["variant"] }) {
  const d = getDefaultClassNames()
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("bg-transparent p-1 [--cell-size:--spacing(9)]", className)}
      classNames={{
        root: cn("w-fit", d.root),
        months: cn("relative flex flex-col gap-4", d.months),
        month: cn("flex w-full flex-col gap-3", d.month),
        nav: cn("absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1", d.nav),
        button_previous: cn(buttonVariants({ variant: buttonVariant }), "size-(--cell-size) rounded-full p-0 select-none aria-disabled:opacity-50", d.button_previous),
        button_next: cn(buttonVariants({ variant: buttonVariant }), "size-(--cell-size) rounded-full p-0 select-none aria-disabled:opacity-50", d.button_next),
        month_caption: cn("flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)", d.month_caption),
        caption_label: cn("text-sm font-medium select-none", d.caption_label),
        table: "w-full border-collapse",
        weekdays: cn("flex", d.weekdays),
        weekday: cn("flex-1 rounded-md text-[0.8rem] font-normal text-muted-foreground select-none", d.weekday),
        week: cn("mt-1 flex w-full", d.week),
        day: cn("group/day relative aspect-square h-full w-full p-0 text-center select-none [&:first-child[data-selected=true]_button]:rounded-l-full [&:last-child[data-selected=true]_button]:rounded-r-full", d.day),
        range_start: cn("rounded-l-full bg-muted", d.range_start),
        range_middle: cn("rounded-none", d.range_middle),
        range_end: cn("rounded-r-full bg-muted", d.range_end),
        today: cn("rounded-full bg-muted text-foreground data-[selected=true]:rounded-none", d.today),
        outside: cn("text-muted-foreground aria-selected:text-muted-foreground", d.outside),
        disabled: cn("text-muted-foreground opacity-40", d.disabled),
        hidden: cn("invisible", d.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...p }) => <div data-slot="calendar" ref={rootRef} className={cn(className)} {...p} />,
        Chevron: ({ className, orientation, ...p }) => (
          <HugeiconsIcon icon={orientation === "left" ? ArrowLeft01Icon : ArrowRight01Icon} className={cn("size-4", className)} {...(p as object)} />
        ),
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle}
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 rounded-full leading-none font-normal",
        "data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground",
        "data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground",
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground",
        "group-data-[focused=true]/day:ring-2 group-data-[focused=true]/day:ring-ring/40",
        className,
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
