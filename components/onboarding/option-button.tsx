"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export function OptionButton({
  label,
  description,
  selected,
  onClick,
}: {
  label: string
  description?: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/50",
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
        <span className="block text-sm font-bold leading-snug">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </button>
  )
}