"use client"

import { useState } from "react"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { parseAmountInput } from "@/lib/finance"
import { OnboardingActions } from "../onboarding-actions"
import { OnboardingStepHeader } from "../onboarding-shell"

export function IncomeStep({
  onContinue,
  onSkip,
}: {
  onContinue: (data: { monthlySalary: number; salaryDay: number; expectedExtraIncome: number } | null) => void
  onSkip: () => void
}) {
  const [salary, setSalary] = useState("")
  const [extraIncome, setExtraIncome] = useState("")
  const [salaryDay, setSalaryDay] = useState("5")

  function handleContinue() {
    const monthlySalary = parseAmountInput(salary)
    if (monthlySalary <= 0) {
      onContinue(null)
      return
    }
    const day = Number.parseInt(salaryDay, 10)
    onContinue({
      monthlySalary,
      salaryDay: Number.isFinite(day) && day >= 1 && day <= 31 ? day : 5,
      expectedExtraIncome: Math.max(0, parseAmountInput(extraIncome)),
    })
  }

  return (
    <div>
      <OnboardingStepHeader
        title="Configure sua renda"
        description="Informe quanto você recebe por mês para calcular quanto pode gastar com segurança."
      />

      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="onboarding-salary">Renda mensal principal</Label>
          <CurrencyInput
            id="onboarding-salary"
            value={salary}
            onValueChange={setSalary}
            placeholder="R$ 0,00"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="onboarding-extra">Renda extra (opcional)</Label>
          <CurrencyInput
            id="onboarding-extra"
            value={extraIncome}
            onValueChange={setExtraIncome}
            placeholder="Freelas, bônus, aluguéis…"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="onboarding-day">Dia do recebimento (opcional)</Label>
          <Input
            id="onboarding-day"
            type="number"
            min={1}
            max={31}
            value={salaryDay}
            onChange={(e) => setSalaryDay(e.target.value)}
          />
        </div>
      </div>

      <OnboardingActions onContinue={handleContinue} onSkip={onSkip} />
    </div>
  )
}