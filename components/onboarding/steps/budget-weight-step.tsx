"use client"

import { useState } from "react"
import { BUDGET_WEIGHT_OPTIONS } from "@/lib/onboarding-personalization"
import type { BudgetWeight } from "@/lib/types"
import { OnboardingActions } from "../onboarding-actions"
import { OnboardingStepHeader } from "../onboarding-shell"
import { OptionButton } from "../option-button"

export function BudgetWeightStep({
  onContinue,
  onSkip,
}: {
  onContinue: (weight: BudgetWeight) => void
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<BudgetWeight | null>(null)

  return (
    <div>
      <OnboardingStepHeader title="O que mais pesa no seu orçamento hoje?" />

      <div className="mt-4 grid grid-cols-2 gap-2">
        {BUDGET_WEIGHT_OPTIONS.map((option) => (
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