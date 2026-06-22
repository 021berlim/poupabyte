"use client"

import { useState } from "react"
import {
  BUDGET_WEIGHT_GROUPS,
  BUDGET_WEIGHT_UNSURE_HELP,
  budgetWeightLabel,
} from "@/lib/onboarding-personalization"
import type { BudgetWeight } from "@/lib/types"
import { OnboardingActions } from "../onboarding-actions"
import { ChoiceGroup, OnboardingChoiceLayout } from "../onboarding-choice-layout"
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
      step={3}
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
      <div className="space-y-2.5">
        {BUDGET_WEIGHT_GROUPS.map((group) => (
          <ChoiceGroup key={group.label} label={group.label}>
            <div
              className={
                group.values.length === 3
                  ? "grid grid-cols-3 gap-1.5"
                  : "grid grid-cols-2 gap-1.5"
              }
            >
              {group.values.map((value) => (
                <OptionButton
                  key={value}
                  layout="chip"
                  label={budgetWeightLabel(value)}
                  selected={selected === value}
                  onClick={() => setSelected(value)}
                />
              ))}
            </div>
          </ChoiceGroup>
        ))}
      </div>

      {selected === "nao-sei" ? (
        <p className="rounded-2xl border border-primary/15 bg-accent/50 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
          {BUDGET_WEIGHT_UNSURE_HELP}
        </p>
      ) : null}
    </OnboardingChoiceLayout>
  )
}