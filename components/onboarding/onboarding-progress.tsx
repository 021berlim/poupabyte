"use client"

import { cn } from "@/lib/utils"

export function OnboardingProgress({ step, total }: { step: number; total: number }) {
  const progress = (step / total) * 100

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: total }, (_, index) => (
            <span
              key={index}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                index < step ? "bg-primary" : "bg-muted-foreground/25",
              )}
            />
          ))}
        </div>
        <span className="shrink-0 text-sm font-medium text-muted-foreground tabular-nums">
          {step}/{total}
        </span>
      </div>
    </div>
  )
}