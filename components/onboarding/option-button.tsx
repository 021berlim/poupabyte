"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export function OptionButton({
  label,
  description,
  selected,
  onClick,
  layout = "stack",
  className,
}: {
  label: string
  description?: string
  selected: boolean
  onClick: () => void
  layout?: "stack" | "inline" | "minimal" | "chip"
  className?: string
}) {
  if (layout === "chip") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "group relative w-full overflow-hidden rounded-xl border px-3 py-3 text-center text-xs font-bold leading-snug text-balance transition-all duration-200",
          "shadow-[0_1px_2px_rgba(27,37,51,0.06)]",
          selected
            ? "border-primary bg-primary text-primary-foreground shadow-[0_4px_14px_-4px_rgba(199,44,59,0.45)] ring-2 ring-primary/20"
            : "border-border/80 bg-card hover:border-primary/35 hover:bg-accent/40 hover:shadow-md active:scale-[0.98]",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-2 left-0 w-1 rounded-full bg-primary transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-40",
          )}
        />
        <span className="relative">{label}</span>
      </button>
    )
  }

  if (layout === "minimal") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full rounded-xl border px-4 py-3 text-sm font-semibold leading-snug shadow-sm transition-all",
          description ? "text-left" : "text-center",
          selected
            ? "border-primary bg-primary text-primary-foreground shadow-md"
            : "border-border/80 bg-card hover:border-primary/35 hover:bg-accent/30",
          className,
        )}
      >
        {label}
      </button>
    )
  }

  if (layout === "inline") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex min-h-[4.75rem] w-full flex-col items-center justify-center gap-2.5 rounded-2xl border px-3 py-3.5 text-center shadow-sm transition-all",
          selected
            ? "border-primary bg-primary/8 shadow-[inset_3px_0_0_0_var(--primary)] ring-1 ring-primary/15"
            : "border-border/80 bg-card hover:border-primary/30 hover:bg-muted/40",
        )}
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/25",
          )}
        >
          {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
        </span>
        <span className="text-xs font-bold leading-tight text-balance">{label}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-2xl border px-4 py-4 text-left shadow-sm transition-all",
        selected
          ? "border-primary bg-primary/8 shadow-[inset_4px_0_0_0_var(--primary)] ring-1 ring-primary/15"
          : "border-border/80 bg-card hover:border-primary/30 hover:bg-muted/30",
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/25",
        )}
      >
        {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-snug">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </button>
  )
}