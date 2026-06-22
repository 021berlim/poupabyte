"use client"

import { useState } from "react"
import {
  FINANCIAL_MOMENT_LAYOUT,
  FINANCIAL_MOMENT_OPTIONS,
} from "@/lib/onboarding-personalization"
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

  function optionFor(value: FinancialObjective) {
    return FINANCIAL_MOMENT_OPTIONS.find((item) => item.value === value)
  }

  return (
    <OnboardingChoiceLayout
      step={2}
      title="O que você quer organizar primeiro?"
      description="A Penny vai usar essa escolha para destacar as funções mais úteis para você."
      actions={
        <OnboardingActions
          onContinue={() => selected && onContinue(selected)}
          onSkip={onSkip}
          continueDisabled={!selected}
        />
      }
    >
      <div className="space-y-2">
        {FINANCIAL_MOMENT_LAYOUT.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={row.length === 1 ? "grid grid-cols-1" : "grid grid-cols-2 gap-1.5"}
          >
            {row.map((value) => {
              const option = optionFor(value)
              if (!option) return null

              return (
                <OptionButton
                  key={value}
                  layout="chip"
                  label={option.label}
                  selected={selected === value}
                  onClick={() => setSelected(value)}
                  className={row.length === 1 ? "col-span-1" : undefined}
                />
              )
            })}
          </div>
        ))}
      </div>
    </OnboardingChoiceLayout>
  )
}