"use client"

import type { ReactNode } from "react"
import { OnboardingStepHeader } from "./onboarding-shell"

export function OnboardingChoiceLayout({
  title,
  description,
  step,
  children,
  actions,
}: {
  title: string
  description?: string
  step?: number
  children: ReactNode
  actions: ReactNode
}) {
  return (
    <div className="flex flex-col gap-5">
      <OnboardingStepHeader title={title} description={description} step={step} />
      <div className="space-y-4">{children}</div>
      {actions}
    </div>
  )
}

export function ChoiceGroup({
  label,
  children,
}: {
  label?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/90">
          {label}
        </p>
      ) : null}
      {children}
    </div>
  )
}