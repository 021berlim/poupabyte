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
      <OnboardingStepHeader
        title="Seu momento financeiro"
        description="Isso define o caminho inicial da Penny no app."
      />

      <p className="mt-6 text-sm font-semibold">Hoje, o que você mais quer melhorar?</p>

      <div className="mt-3 space-y-2">
        {FINANCIAL_MOMENT_OPTIONS.map((option) => (
          <OptionButton
            key={option.value}
            label={option.label}
            description={option.description}
            selected={selected === option.value}
            onClick={() => setSelected(option.value)}
          />
        ))}
      </div>

      <OnboardingActions
        onContinue={() => selected && onContinue(selected)}
        onSkip={onSkip}
        continueDisabled={!selected}
      />
    </div>
  )
}