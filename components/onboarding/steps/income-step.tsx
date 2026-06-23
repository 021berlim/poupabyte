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
  OnboardingFieldSection,
  OnboardingOptionList,
  OnboardingPennyTip,
  OnboardingSplitFields,
  OnboardingStepHeader,
} from "../onboarding-shell"
import { OptionButton } from "../option-button"

function incomeTypeHasDetailInputs(type: IncomeType | null): type is IncomeType {
  return type !== null && type !== "sem-renda"
}

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
  const splitLayout = incomeTypeHasDetailInputs(incomeType)

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

  function renderIncomeDetails() {
    if (incomeType === "salario-fixo") {
      return (
        <OnboardingFieldSection>
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-income">Valor mensal</Label>
            <CurrencyInput
              id="onboarding-income"
              value={monthlyIncome}
              onChange={setMonthlyIncome}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-day">Dia em que você recebe</Label>
            <Input
              id="onboarding-day"
              type="number"
              min={1}
              max={31}
              value={salaryDay}
              onChange={(e) => setSalaryDay(e.target.value)}
            />
          </div>
          <OnboardingFieldHelp>{incomeFieldHelp("salario-fixo")}</OnboardingFieldHelp>
        </OnboardingFieldSection>
      )
    }

    if (incomeType === "autonomo") {
      return (
        <OnboardingFieldSection>
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-income">Média mensal</Label>
            <CurrencyInput
              id="onboarding-income"
              value={monthlyIncome}
              onChange={setMonthlyIncome}
              placeholder="0,00"
            />
            <OnboardingFieldHelp>{incomeFieldHelp("autonomo")}</OnboardingFieldHelp>
          </div>
          <OnboardingOptionList label="Varia muito? (opcional)" compact>
            {INCOME_VARIABILITY_OPTIONS.map((option) => (
              <OptionButton
                key={option.value}
                layout="chip"
                label={option.label}
                selected={incomeVariability === option.value}
                onClick={() => setIncomeVariability(option.value)}
              />
            ))}
          </OnboardingOptionList>
        </OnboardingFieldSection>
      )
    }

    if (incomeType === "negocio-proprio") {
      return (
        <OnboardingFieldSection>
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-income">Retirada mensal pessoal</Label>
            <CurrencyInput
              id="onboarding-income"
              value={monthlyIncome}
              onChange={setMonthlyIncome}
              placeholder="0,00"
            />
            <OnboardingFieldHelp>{incomeFieldHelp("negocio-proprio")}</OnboardingFieldHelp>
          </div>
          <OnboardingOptionList label="Separa pessoal e negócio? (opcional)" compact>
            {BUSINESS_SEPARATION_OPTIONS.map((option) => (
              <OptionButton
                key={option.value}
                layout="chip"
                label={option.label}
                selected={businessSeparation === option.value}
                onClick={() => setBusinessSeparation(option.value)}
              />
            ))}
          </OnboardingOptionList>
        </OnboardingFieldSection>
      )
    }

    if (incomeType === "renda-variavel") {
      return (
        <OnboardingFieldSection>
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-income">Média aproximada</Label>
            <CurrencyInput
              id="onboarding-income"
              value={monthlyIncome}
              onChange={setMonthlyIncome}
              placeholder="0,00"
            />
            <OnboardingFieldHelp>{incomeFieldHelp("renda-variavel")}</OnboardingFieldHelp>
          </div>
        </OnboardingFieldSection>
      )
    }

    if (incomeType === "ocasional") {
      return (
        <OnboardingFieldSection>
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-income">Valor aproximado quando recebe</Label>
            <CurrencyInput
              id="onboarding-income"
              value={monthlyIncome}
              onChange={setMonthlyIncome}
              placeholder="0,00"
            />
            <OnboardingFieldHelp>{incomeFieldHelp("ocasional")}</OnboardingFieldHelp>
          </div>
        </OnboardingFieldSection>
      )
    }

    return null
  }

  const incomeTypeOptions = (
    <OnboardingOptionList label="Tipo de renda" fill={splitLayout}>
      {INCOME_TYPE_OPTIONS.map((option) => (
        <OptionButton
          key={option.value}
          layout="stack"
          label={option.label}
          selected={incomeType === option.value}
          onClick={() => selectType(option.value)}
          className={splitLayout ? "flex-1" : undefined}
        />
      ))}
    </OnboardingOptionList>
  )

  return (
    <div className="min-w-0">
      <OnboardingStepHeader
        title="Como seu dinheiro entra?"
        description="Isso ajuda a Penny a montar um controle adequado ao seu tipo de renda."
      />

      <OnboardingSplitFields
        split={splitLayout}
        options={incomeTypeOptions}
        details={
          splitLayout ? (
            <div className="flex h-full min-h-0 flex-col justify-start space-y-4">
              {renderIncomeDetails()}
              <OnboardingPennyTip>{pennyIncomeMessage(incomeType)}</OnboardingPennyTip>
            </div>
          ) : null
        }
      />

      {incomeType === "sem-renda" ? (
        <div className="mt-4">
          <OnboardingPennyTip>{incomeFieldHelp("sem-renda")}</OnboardingPennyTip>
        </div>
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