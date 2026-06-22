"use client"

import { useState } from "react"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { parseAmountInput } from "@/lib/finance"
import {
  BUSINESS_SEPARATION_OPTIONS,
  INCOME_TYPE_OPTIONS,
  INCOME_VARIABILITY_OPTIONS,
  incomeTypeAllowsOptionalAmount,
  incomeTypeRequiresAmount,
  pennyIncomeMessage,
  type OnboardingIncomeData,
} from "@/lib/onboarding-personalization"
import type { BusinessSeparation, IncomeType, IncomeVariability } from "@/lib/types"
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
  const [incomeType, setIncomeType] = useState<IncomeType | null>(null)
  const [monthlyIncome, setMonthlyIncome] = useState("")
  const [salaryDay, setSalaryDay] = useState("5")
  const [incomeVariability, setIncomeVariability] = useState<IncomeVariability | null>(null)
  const [businessSeparation, setBusinessSeparation] = useState<BusinessSeparation | null>(null)

  const parsedIncome = parseAmountInput(monthlyIncome)
  const requiresAmount = incomeType ? incomeTypeRequiresAmount(incomeType) : false
  const optionalAmount = incomeType ? incomeTypeAllowsOptionalAmount(incomeType) : false

  const canContinue =
    incomeType !== null &&
    (incomeType === "sem-renda" || (requiresAmount && parsedIncome > 0) || optionalAmount)

  function handleContinue() {
    if (!incomeType || !canContinue) return

    const day = Number.parseInt(salaryDay, 10)
    const data: OnboardingIncomeData = {
      incomeType,
      monthlyIncome: incomeType === "sem-renda" ? 0 : Math.max(0, parsedIncome),
    }

    if (incomeType === "salario-fixo") {
      data.salaryDay = Number.isFinite(day) && day >= 1 && day <= 31 ? day : 5
    }

    if (incomeType === "autonomo" && incomeVariability) {
      data.incomeVariability = incomeVariability
    }

    if (incomeType === "negocio-proprio" && businessSeparation) {
      data.businessSeparation = businessSeparation
    }

    onContinue(data)
  }

  function selectType(type: IncomeType) {
    setIncomeType(type)
    if (type === "sem-renda") {
      setMonthlyIncome("")
    }
    if (type !== "autonomo") setIncomeVariability(null)
    if (type !== "negocio-proprio") setBusinessSeparation(null)
  }

  return (
    <div>
      <OnboardingStepHeader title="Como você recebe?" />

      <div className="mt-5 grid grid-cols-2 gap-1.5">
        {INCOME_TYPE_OPTIONS.map((option) => (
          <OptionButton
            key={option.value}
            layout="chip"
            label={option.label}
            selected={incomeType === option.value}
            onClick={() => selectType(option.value)}
          />
        ))}
      </div>

      {incomeType === "salario-fixo" ? (
        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-income">Renda mensal</Label>
            <CurrencyInput
              id="onboarding-income"
              value={monthlyIncome}
              onChange={setMonthlyIncome}
              placeholder="Ex: 3.500"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-day">Dia que recebe</Label>
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
      ) : null}

      {incomeType === "autonomo" ? (
        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-income">Média por mês</Label>
            <CurrencyInput
              id="onboarding-income"
              value={monthlyIncome}
              onChange={setMonthlyIncome}
              placeholder="Ex: 4.000"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Varia muito? <span className="font-normal text-muted-foreground">opcional</span>
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {INCOME_VARIABILITY_OPTIONS.map((option) => (
                <OptionButton
                  key={option.value}
                  layout="inline"
                  label={option.label}
                  selected={incomeVariability === option.value}
                  onClick={() => setIncomeVariability(option.value)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {incomeType === "negocio-proprio" ? (
        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-income">Quanto retira por mês?</Label>
            <CurrencyInput
              id="onboarding-income"
              value={monthlyIncome}
              onChange={setMonthlyIncome}
              placeholder="Só o pessoal"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Separa pessoal e negócio? <span className="font-normal text-muted-foreground">opcional</span>
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {BUSINESS_SEPARATION_OPTIONS.map((option) => (
                <OptionButton
                  key={option.value}
                  layout="inline"
                  label={option.label}
                  selected={businessSeparation === option.value}
                  onClick={() => setBusinessSeparation(option.value)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {incomeType === "renda-variavel" ? (
        <div className="mt-5 space-y-1.5">
          <Label htmlFor="onboarding-income">
            Média do mês <span className="font-normal text-muted-foreground">opcional</span>
          </Label>
          <CurrencyInput
            id="onboarding-income"
            value={monthlyIncome}
            onChange={setMonthlyIncome}
            placeholder="Pode pular"
          />
        </div>
      ) : null}

      {incomeType === "ocasional" ? (
        <div className="mt-5 space-y-1.5">
          <Label htmlFor="onboarding-income">
            Quanto costuma receber? <span className="font-normal text-muted-foreground">opcional</span>
          </Label>
          <CurrencyInput
            id="onboarding-income"
            value={monthlyIncome}
            onChange={setMonthlyIncome}
            placeholder="Pode pular"
          />
        </div>
      ) : null}

      {incomeType ? (
        <p className="mt-4 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {pennyIncomeMessage(incomeType)}
        </p>
      ) : null}

      <OnboardingActions onContinue={handleContinue} onSkip={onSkip} continueDisabled={!canContinue} />
    </div>
  )
}