"use client"

import type { ReactNode } from "react"
import { OnboardingStepHeader } from "./onboarding-shell"

export function OnboardingChoiceLayout({
  title,
  description,
  children,
  actions,
}: {
  title: string
  description?: string
  children: ReactNode
  actions: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <OnboardingStepHeader title={title} description={description} />
      <div>{children}</div>
      <div className="pt-0.5">{actions}</div>
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
    <div className="space-y-1.5">
      {label ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      ) : null}
      {children}
    </div>
  )
}