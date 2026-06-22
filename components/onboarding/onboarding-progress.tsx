"use client"

import { cn } from "@/lib/utils"

const STEP_SHORT_LABELS = ["Renda", "Objetivo", "Orçamento", "Meta"] as const

export function OnboardingProgress({ step, total }: { step: number; total: number }) {
  const progress = (step / total) * 100

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">
          Etapa <span className="font-extrabold text-foreground">{step}</span> de{" "}
          <span className="font-extrabold text-foreground">{total}</span>
        </p>
        <span className="text-xs font-bold tabular-nums text-primary">{Math.round(progress)}%</span>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 hidden gap-1 sm:grid sm:grid-cols-4">
        {STEP_SHORT_LABELS.slice(0, total).map((label, index) => {
          const stepNumber = index + 1
          const active = stepNumber === step
          const done = stepNumber < step
          return (
            <div
              key={label}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center transition-colors",
                active && "bg-primary/8",
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-[11px] font-extrabold tabular-nums ring-2 ring-offset-2 ring-offset-card",
                  active
                    ? "bg-primary text-primary-foreground ring-primary/30"
                    : done
                      ? "bg-success text-success-foreground ring-success/25"
                      : "bg-muted text-muted-foreground ring-transparent",
                )}
              >
                {done ? "✓" : stepNumber}
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold leading-tight",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}