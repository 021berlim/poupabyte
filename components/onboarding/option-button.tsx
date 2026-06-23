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
  layout?: "stack" | "inline" | "minimal" | "chip" | "grid"
  className?: string
}) {
  if (layout === "chip") {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onClick}
        className={cn(
          "h-auto min-h-10 w-full rounded-md border px-2.5 py-2 text-center text-xs font-medium leading-snug text-balance transition-colors sm:text-sm",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input bg-transparent hover:border-primary/40",
          className,
        )}
      >
        {label}
      </button>
    )
  }

  if (layout === "grid") {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onClick}
        className={cn(
          "flex h-full min-h-[5rem] w-full flex-col gap-1.5 rounded-md border px-3 py-3 text-left transition-colors",
          selected
            ? "border-primary bg-primary/8 ring-1 ring-primary/15"
            : "border-input bg-transparent hover:border-primary/40",
          className,
        )}
      >
        <span className="flex items-start gap-2.5">
          <span
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30",
            )}
          >
            {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
          </span>
          <span className="text-sm font-medium leading-snug text-balance">{label}</span>
        </span>
        {description ? (
          <span className="pl-7 text-xs leading-relaxed text-muted-foreground">{description}</span>
        ) : null}
      </button>
    )
  }

  if (layout === "minimal") {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onClick}
        className={cn(
          "h-10 w-full rounded-md border px-4 text-sm font-medium leading-snug transition-colors",
          description ? "text-left" : "text-center",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input bg-transparent hover:border-primary/40",
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
        role="radio"
        aria-checked={selected}
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
          selected ? "bg-primary/8" : "hover:bg-muted/40",
        )}
      >
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30",
          )}
        >
          {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </span>
        <span className="text-sm font-medium leading-snug text-balance">{label}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors first:rounded-t-md last:rounded-b-md",
        selected ? "bg-primary/8" : "hover:bg-muted/40",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30",
        )}
      >
        {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-snug">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </button>
  )
}