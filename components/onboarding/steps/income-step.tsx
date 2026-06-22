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
  incomeFieldHelp,
  incomeTypeAllowsOptionalAmount,
  incomeTypeRequiresAmount,
  pennyIncomeMessage,
  type OnboardingIncomeData,
} from "@/lib/onboarding-personalization"
import type { BusinessSeparation, IncomeType, IncomeVariability } from "@/lib/types"
import { OnboardingActions } from "../onboarding-actions"
import {
  OnboardingFieldHelp,
  OnboardingPennyTip,
  OnboardingStepHeader,
} from "../onboarding-shell"
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

  const continueDisabledLabel =
    incomeType === null
      ? "Escolha uma opção para continuar"
      : requiresAmount && parsedIncome <= 0
        ? "Informe o valor para continuar"
        : "Escolha uma opção para continuar"

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
    <div className="space-y-5">
      <OnboardingStepHeader
        step={1}
        title="Como seu dinheiro entra?"
        description="Isso ajuda a Penny a montar um controle adequado ao seu tipo de renda."
      />

      <div className="grid grid-cols-2 gap-2">
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
        <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/30 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-income" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Valor mensal
            </Label>
            <CurrencyInput
              id="onboarding-income"
              value={monthlyIncome}
              onChange={setMonthlyIncome}
              placeholder="0,00"
              className="h-11 rounded-xl bg-card"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-day" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Dia em que você recebe
            </Label>
            <Input
              id="onboarding-day"
              type="number"
              min={1}
              max={31}
              value={salaryDay}
              onChange={(e) => setSalaryDay(e.target.value)}
              className="h-11 rounded-xl bg-card"
            />
          </div>
          <OnboardingFieldHelp>{incomeFieldHelp("salario-fixo")}</OnboardingFieldHelp>
        </div>
      ) : null}

      {incomeType === "autonomo" ? (
        <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/30 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-income" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Média mensal
            </Label>
            <CurrencyInput
              id="onboarding-income"
              value={monthlyIncome}
              onChange={setMonthlyIncome}
              placeholder="0,00"
              className="h-11 rounded-xl bg-card"
            />
            <OnboardingFieldHelp>{incomeFieldHelp("autonomo")}</OnboardingFieldHelp>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Varia muito? <span className="font-normal text-muted-foreground">opcional</span>
            </p>
            <div className="grid grid-cols-1 gap-2">
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
        <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/30 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-income" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Retirada mensal pessoal
            </Label>
            <CurrencyInput
              id="onboarding-income"
              value={monthlyIncome}
              onChange={setMonthlyIncome}
              placeholder="0,00"
              className="h-11 rounded-xl bg-card"
            />
            <OnboardingFieldHelp>{incomeFieldHelp("negocio-proprio")}</OnboardingFieldHelp>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Separa pessoal e negócio? <span className="font-normal text-muted-foreground">opcional</span>
            </p>
            <div className="grid grid-cols-1 gap-2">
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
        <div className="space-y-1.5 rounded-2xl border border-border/70 bg-muted/30 p-4">
          <Label htmlFor="onboarding-income" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Média aproximada
          </Label>
          <CurrencyInput
            id="onboarding-income"
            value={monthlyIncome}
            onChange={setMonthlyIncome}
            placeholder="0,00"
            className="h-11 rounded-xl bg-card"
          />
          <OnboardingFieldHelp>{incomeFieldHelp("renda-variavel")}</OnboardingFieldHelp>
        </div>
      ) : null}

      {incomeType === "ocasional" ? (
        <div className="space-y-1.5 rounded-2xl border border-border/70 bg-muted/30 p-4">
          <Label htmlFor="onboarding-income" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Valor aproximado quando recebe
          </Label>
          <CurrencyInput
            id="onboarding-income"
            value={monthlyIncome}
            onChange={setMonthlyIncome}
            placeholder="0,00"
            className="h-11 rounded-xl bg-card"
          />
          <OnboardingFieldHelp>{incomeFieldHelp("ocasional")}</OnboardingFieldHelp>
        </div>
      ) : null}

      {incomeType === "sem-renda" ? (
        <OnboardingPennyTip>{incomeFieldHelp("sem-renda")}</OnboardingPennyTip>
      ) : null}

      {incomeType && incomeType !== "sem-renda" ? (
        <OnboardingPennyTip>{pennyIncomeMessage(incomeType)}</OnboardingPennyTip>
      ) : null}

      <OnboardingActions
        onContinue={handleContinue}
        onSkip={onSkip}
        continueDisabled={!canContinue}
        continueDisabledLabel={continueDisabledLabel}
      />
    </div>
  )
}