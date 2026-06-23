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
    <div className="min-w-0">
      <OnboardingStepHeader title={title} description={description} />
      <div className="mt-6 min-w-0 space-y-4">{children}</div>
      {actions}
    </div>
  )
}