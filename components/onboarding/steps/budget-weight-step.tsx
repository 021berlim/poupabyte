"use client"

import { useState } from "react"
import {
  BUDGET_WEIGHT_GROUPS,
  BUDGET_WEIGHT_UNSURE_HELP,
  budgetWeightLabel,
} from "@/lib/onboarding-personalization"
import type { BudgetWeight } from "@/lib/types"
import { OnboardingActions } from "../onboarding-actions"
import { OnboardingChoiceLayout } from "../onboarding-choice-layout"
import { OnboardingOptionList } from "../onboarding-shell"
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
    <OnboardingChoiceLayout
      title="O que mais pesa no seu mês?"
      description="Escolha o ponto que mais afeta seu orçamento hoje."
      actions={
        <OnboardingActions
          onContinue={() => selected && onContinue(selected)}
          onSkip={onSkip}
          continueDisabled={!selected}
        />
      }
    >
      <div className="min-w-0 space-y-4">
        {BUDGET_WEIGHT_GROUPS.map((group) => (
          <OnboardingOptionList key={group.label} label={group.label} compact>
            {group.values.map((value) => (
              <OptionButton
                key={value}
                layout="chip"
                label={budgetWeightLabel(value)}
                selected={selected === value}
                onClick={() => setSelected(value)}
              />
            ))}
          </OnboardingOptionList>
        ))}
      </div>

      {selected === "nao-sei" ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{BUDGET_WEIGHT_UNSURE_HELP}</p>
      ) : null}
    </OnboardingChoiceLayout>
  )
}