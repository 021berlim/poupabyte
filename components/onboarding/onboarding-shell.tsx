"use client"

import { AuthShell } from "@/components/auth/auth-shell"
import { cn } from "@/lib/utils"
import { Sparkles } from "lucide-react"
import type { ReactNode } from "react"
import { OnboardingProgress } from "./onboarding-progress"

export const ONBOARDING_TOTAL_STEPS = 4

export function OnboardingShell({
  children,
  step = 1,
}: {
  children: ReactNode
  step?: number
}) {
  return (
    <AuthShell branding wide>
      <div className="min-w-0">
        <OnboardingProgress step={step} total={ONBOARDING_TOTAL_STEPS} />
        {children}
      </div>
    </AuthShell>
  )
}

export function OnboardingStepHeader({
  title,
  description,
}: {
  title: string
  description?: string
  step?: number
  totalSteps?: number
}) {
  return (
    <header className="mt-6">
      <h2 className="text-[clamp(1.5rem,6vw,1.75rem)] font-extrabold tracking-tight">{title}</h2>
      {description ? (
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </header>
  )
}

export function OnboardingOptionList({
  label,
  children,
  compact = false,
  fill = false,
}: {
  label?: string
  children: ReactNode
  compact?: boolean
  fill?: boolean
}) {
  if (compact) {
    return (
      <div className={cn("min-w-0 space-y-2", fill && "flex h-full flex-col")}>
        {label ? <p className="text-sm font-medium text-muted-foreground">{label}</p> : null}
        <div
          role="radiogroup"
          aria-label={label}
          className="grid min-w-0 grid-cols-2 gap-2"
        >
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("min-w-0 space-y-2", fill && "flex h-full flex-col")}>
      {label ? <p className="shrink-0 text-sm font-medium text-muted-foreground">{label}</p> : null}
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          "divide-y divide-border/60 rounded-md border border-border/70",
          fill && "flex min-h-0 flex-1 flex-col",
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function OnboardingOptionGrid({
  label,
  children,
}: {
  label?: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0 space-y-2">
      {label ? <p className="text-sm font-medium text-muted-foreground">{label}</p> : null}
      <div role="radiogroup" aria-label={label} className="grid min-w-0 grid-cols-2 gap-2">
        {children}
      </div>
    </div>
  )
}

export function OnboardingSplitFields({
  details,
  options,
  split = true,
}: {
  details?: ReactNode
  options: ReactNode
  split?: boolean
}) {
  return (
    <div className="mt-6 grid min-w-0 gap-4 sm:grid-cols-2 sm:items-stretch">
      <div className={cn("flex min-w-0 flex-col", !split && "sm:col-span-2")}>{options}</div>
      {split && details ? <div className="flex min-w-0 flex-col">{details}</div> : null}
    </div>
  )
}

export function OnboardingFieldSection({ children }: { children: ReactNode }) {
  return <div className="min-w-0 space-y-4">{children}</div>
}

export function OnboardingPennyTip({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      <Sparkles className="mr-1.5 inline size-3.5 text-primary" aria-hidden="true" />
      {children}
    </p>
  )
}

export function OnboardingFieldHelp({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
}