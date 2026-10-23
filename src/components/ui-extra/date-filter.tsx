import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, ArrowRight01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import type { DateRange } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

export type DatePreset = "all" | "today" | "7" | "30"
/** A date filter: a preset, or a custom range (either end can be open while picking). */
export type DateFilterValue = { preset: DatePreset } | { preset: "custom"; from?: Date; to?: Date }
export const ALL_DATES: DateFilterValue = { preset: "all" }

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All period" },
  { value: "today", label: "Today" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
]
const DAY = 86_400_000
const short = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" })

/** The trigger's text: the preset, or the range like "Oct 3 – Oct 9". */
export const dateFilterLabel = (v: DateFilterValue) => {
  if (v.preset !== "custom") return PRESETS.find((p) => p.value === v.preset)!.label
  if (v.from && v.to) return v.from.toDateString() === v.to.toDateString() ? short(v.from) : `${short(v.from)} – ${short(v.to)}`
  if (v.from) return `From ${short(v.from)}`
  return "Custom range"
}

/** Whether time `t` falls in the filter. */
export function inDateFilter(t: number, v: DateFilterValue) {
  if (v.preset === "all") return true
  if (v.preset === "today") return new Date(t).toDateString() === new Date().toDateString()
  if (v.preset !== "custom") return t >= Date.now() - Number(v.preset) * DAY
  const start = v.from ? new Date(v.from).setHours(0, 0, 0, 0) : -Infinity
  const end = (v.to ?? v.from) ? new Date(v.to ?? v.from!).setHours(23, 59, 59, 999) : Infinity
  return t >= start && t <= end
}

/**
 * Date filter: a pill that opens the presets (All period, Today, Last 7 days, Last 30 days) and,
 * below them, a calendar to pick a custom range. Future days can't be picked.
 */
export function DateFilter({ value, onChange, className, label = "Date" }: { value: DateFilterValue; onChange: (v: DateFilterValue) => void; className?: string; label?: string }) {
  const [open, setOpen] = useState(false)
  // the calendar shows only once Custom range is picked (or when a custom range is already set)
  const [custom, setCustom] = useState(false)
  const range: DateRange | undefined = value.preset === "custom" ? { from: value.from, to: value.to } : undefined
  return (
    <Popover open={open} onOpenChange={(o) => (setOpen(o), o && setCustom(value.preset === "custom"))}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${dateFilterLabel(value)}`}
          className={cn(
            "flex h-8 w-[160px] items-center justify-between gap-1.5 whitespace-nowrap rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-sm outline-none transition-[color,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
            className,
          )}
        >
          <span className="truncate tabular-nums">{dateFilterLabel(value)}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      {/* presets beside the calendar keeps it short; it never grows past the space on screen and scrolls if it must */}
      <PopoverContent
        align="end"
        side="bottom"
        collisionPadding={12}
        className="max-h-(--radix-popover-content-available-height) w-auto max-w-[calc(100vw-24px)] gap-0 overflow-y-auto p-0 [scrollbar-width:thin]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col sm:flex-row">
          <div className={cn("flex flex-col p-1.5 sm:w-44", custom && "sm:border-r")}>
            <p className="px-2.5 pb-1 pt-1.5 text-xs text-muted-foreground">{label}</p>
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => (onChange({ preset: p.value }), setOpen(false))}
                className="flex h-9 w-full items-center justify-between gap-2 whitespace-nowrap rounded-xl px-2.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted"
              >
                {p.label}
                {value.preset === p.value && !custom && <HugeiconsIcon icon={Tick02Icon} className="size-4" />}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustom(true)}
              aria-expanded={custom}
              className={cn("flex h-9 w-full items-center justify-between gap-2 whitespace-nowrap rounded-xl px-2.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted", custom && "bg-muted")}
            >
              Custom range
              {value.preset === "custom" ? <HugeiconsIcon icon={Tick02Icon} className="size-4" /> : <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-muted-foreground" />}
            </button>
          </div>
          {custom && (
          <div className="border-t p-3 sm:border-t-0">
            <p className="px-1 pb-2 text-xs text-muted-foreground">Pick a start and end date</p>
            <Calendar
              mode="range"
              selected={range}
              defaultMonth={value.preset === "custom" ? value.from : undefined}
              disabled={{ after: new Date() }}
              onSelect={(r) => {
                onChange({ preset: "custom", from: r?.from, to: r?.to })
                // a full range picked: done
                if (r?.from && r?.to && r.from.getTime() !== r.to.getTime()) setOpen(false)
              }}
            />
          </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
