"use client"

import { useState } from "react"
import { FINANCIAL_MOMENT_LAYOUT, financialMomentLabel } from "@/lib/onboarding-personalization"
import type { FinancialObjective } from "@/lib/types"
import { OnboardingActions } from "../onboarding-actions"
import { OnboardingChoiceLayout } from "../onboarding-choice-layout"
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
    <OnboardingChoiceLayout
      title="Hoje, o que você mais quer melhorar?"
      actions={
        <OnboardingActions
          onContinue={() => selected && onContinue(selected)}
          onSkip={onSkip}
          skipLabel="Pular"
          continueDisabled={!selected}
        />
      }
    >
      <div className="space-y-1.5">
        {FINANCIAL_MOMENT_LAYOUT.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={row.length === 1 ? "grid grid-cols-1" : "grid grid-cols-2 gap-1.5"}
          >
            {row.map((value) => (
              <OptionButton
                key={value}
                layout="chip"
                label={financialMomentLabel(value)}
                selected={selected === value}
                onClick={() => setSelected(value)}
                className={row.length === 1 ? "col-span-1" : undefined}
              />
            ))}
          </div>
        ))}
      </div>
    </OnboardingChoiceLayout>
  )
}