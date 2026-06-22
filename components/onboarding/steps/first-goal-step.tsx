"use client"

import { useState } from "react"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { parseAmountInput } from "@/lib/finance"
import type { OnboardingGoalData } from "@/lib/onboarding-personalization"
import { OnboardingActions } from "../onboarding-actions"
import { OnboardingStepHeader } from "../onboarding-shell"
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
    <div>
      <OnboardingStepHeader title="Quer criar uma meta agora?" />

      <div className="mt-4 grid grid-cols-2 gap-2">
        <OptionButton
          layout="minimal"
          label="Sim"
          selected={wantsGoal === true}
          onClick={() => setWantsGoal(true)}
        />
        <OptionButton
          layout="minimal"
          label="Agora não"
          selected={wantsGoal === false}
          onClick={() => setWantsGoal(false)}
        />
      </div>

      {wantsGoal === true ? (
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-goal-name">Nome da meta</Label>
            <Input
              id="onboarding-goal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Viagem, celular novo…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-goal-target">Valor desejado</Label>
            <CurrencyInput id="onboarding-goal-target" value={target} onChange={setTarget} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-goal-deadline">Prazo</Label>
            <Input
              id="onboarding-goal-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      <OnboardingActions
        onContinue={handleFinish}
        onSkip={() => onFinish()}
        continueLabel={wantsGoal === true ? "Concluir" : "Continuar"}
        skipLabel="Pular"
        continueDisabled={wantsGoal === null || (wantsGoal === true && !canFinishWithGoal)}
      />
    </div>
  )
}