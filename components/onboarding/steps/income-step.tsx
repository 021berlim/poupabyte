"use client"

import { useState } from "react"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { parseAmountInput } from "@/lib/finance"
import { EXTRA_INCOME_OPTIONS, type OnboardingIncomeData } from "@/lib/onboarding-personalization"
import type { ExtraIncomeFrequency } from "@/lib/types"
import { OnboardingActions } from "../onboarding-actions"
import { OnboardingStepHeader } from "../onboarding-shell"
import { OptionButton } from "../option-button"

export function IncomeStep({
  onContinue,
  onSkip,
}: {
  onContinue: (data: OnboardingIncomeData) => void
  onSkip: () => void
}) {
  const [salary, setSalary] = useState("")
  const [salaryDay, setSalaryDay] = useState("5")
  const [extraFrequency, setExtraFrequency] = useState<ExtraIncomeFrequency>("none")
  const [extraIncome, setExtraIncome] = useState("")

  const monthlySalary = parseAmountInput(salary)
  const canContinue = monthlySalary > 0

  function handleContinue() {
    if (!canContinue) return

    const day = Number.parseInt(salaryDay, 10)
    let expectedExtraIncome = 0

    if (extraFrequency === "monthly") {
      expectedExtraIncome = Math.max(0, parseAmountInput(extraIncome))
    }

    onContinue({
      monthlySalary,
      salaryDay: Number.isFinite(day) && day >= 1 && day <= 31 ? day : 5,
      expectedExtraIncome,
      extraIncomeFrequency: extraFrequency,
    })
  }

  return (
    <div>
      <OnboardingStepHeader
        title="Sua renda"
        description="Só o essencial para a Penny montar seu caminho financeiro."
      />

      <div className="mt-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="onboarding-salary">Renda mensal principal</Label>
          <CurrencyInput
            id="onboarding-salary"
            value={salary}
            onChange={setSalary}
            placeholder="Quanto você recebe por mês?"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="onboarding-day">Dia que costuma receber</Label>
          <Input
            id="onboarding-day"
            type="number"
            min={1}
            max={31}
            value={salaryDay}
            onChange={(e) => setSalaryDay(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Você tem renda extra?</p>
          <div className="grid grid-cols-2 gap-2">
            {EXTRA_INCOME_OPTIONS.map((option) => (
              <OptionButton
                key={option.value}
                layout="inline"
                label={option.label}
                selected={extraFrequency === option.value}
                onClick={() => {
                  setExtraFrequency(option.value)
                  if (option.value === "none") setExtraIncome("")
                }}
              />
            ))}
          </div>
        </div>

        {extraFrequency === "monthly" ? (
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-extra-monthly">Valor médio da renda extra</Label>
            <CurrencyInput
              id="onboarding-extra-monthly"
              value={extraIncome}
              onChange={setExtraIncome}
              placeholder="Freelas, bônus, aluguéis…"
            />
          </div>
        ) : null}
      </div>

      <OnboardingActions
        onContinue={handleContinue}
        onSkip={onSkip}
        continueDisabled={!canContinue}
        continueLabel="Continuar"
      />
    </div>
  )
}