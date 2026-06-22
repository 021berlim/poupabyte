"use client"

import { useState } from "react"
import { FINANCIAL_MOMENT_OPTIONS } from "@/lib/onboarding-personalization"
import type { FinancialObjective } from "@/lib/types"
import { OnboardingActions } from "../onboarding-actions"
import { OnboardingStepHeader } from "../onboarding-shell"
import { OptionButton } from "../option-button"

export function FinancialMomentStep({
  onContinue,
  onSkip,
}: {
  onContinue: (objective: FinancialObjective) => void
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<FinancialObjective | null>(null)

  return (
    <div>
      <OnboardingStepHeader title="Hoje, o que você mais quer melhorar?" />

      <div className="mt-4 space-y-1.5">
        {FINANCIAL_MOMENT_OPTIONS.map((option) => (
          <OptionButton
            key={option.value}
            layout="minimal"
            label={option.label}
            selected={selected === option.value}
            onClick={() => setSelected(option.value)}
          />
        ))}
      </div>

      <OnboardingActions
        onContinue={() => selected && onContinue(selected)}
        onSkip={onSkip}
        skipLabel="Pular"
        continueDisabled={!selected}
      />
    </div>
  )
}