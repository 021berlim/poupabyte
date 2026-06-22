"use client"

import { useState } from "react"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { parseAmountInput } from "@/lib/finance"
import type { OnboardingGoalData } from "@/lib/onboarding-personalization"
import { OnboardingActions } from "../onboarding-actions"
import { OnboardingChoiceLayout } from "../onboarding-choice-layout"
import { OptionButton } from "../option-button"

function defaultDeadline(): string {
  const date = new Date()
  date.setMonth(date.getMonth() + 6)
  return date.toISOString().slice(0, 10)
}

export function FirstGoalStep({
  onFinish,
}: {
  onFinish: (goal?: OnboardingGoalData) => void
}) {
  const [wantsGoal, setWantsGoal] = useState<boolean | null>(null)
  const [name, setName] = useState("")
  const [target, setTarget] = useState("")
  const [deadline, setDeadline] = useState(defaultDeadline())

  const targetValue = parseAmountInput(target)
  const canFinishWithGoal = wantsGoal === true && name.trim().length > 0 && targetValue > 0 && deadline.length > 0

  function handleFinish() {
    if (wantsGoal === false) {
      onFinish()
      return
    }
    if (!canFinishWithGoal) return
    onFinish({
      name: name.trim(),
      target: targetValue,
      deadline: new Date(deadline).toISOString(),
    })
  }

  return (
    <OnboardingChoiceLayout
      title="Quer criar uma meta agora?"
      actions={
        <OnboardingActions
          onContinue={handleFinish}
          onSkip={() => onFinish()}
          continueLabel={wantsGoal === true ? "Concluir" : "Continuar"}
          skipLabel="Pular"
          continueDisabled={wantsGoal === null || (wantsGoal === true && !canFinishWithGoal)}
        />
      }
    >
      <div className="grid grid-cols-2 gap-1.5">
        <OptionButton
          layout="chip"
          label="Sim"
          selected={wantsGoal === true}
          onClick={() => setWantsGoal(true)}
        />
        <OptionButton
          layout="chip"
          label="Agora não"
          selected={wantsGoal === false}
          onClick={() => setWantsGoal(false)}
        />
      </div>

      {wantsGoal === true ? (
        <div className="mt-3 space-y-2.5">
          <div className="space-y-1">
            <Label htmlFor="onboarding-goal-name" className="text-xs">
              Nome da meta
            </Label>
            <Input
              id="onboarding-goal-name"
              className="h-10"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Viagem, celular novo…"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="onboarding-goal-target" className="text-xs">
                Valor
              </Label>
              <CurrencyInput id="onboarding-goal-target" value={target} onChange={setTarget} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="onboarding-goal-deadline" className="text-xs">
                Prazo
              </Label>
              <Input
                id="onboarding-goal-deadline"
                className="h-10"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </OnboardingChoiceLayout>
  )
}