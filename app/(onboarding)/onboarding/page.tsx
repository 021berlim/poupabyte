"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { OnboardingGuard } from "@/components/onboarding-guard"
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress"
import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { IncomeStep } from "@/components/onboarding/steps/income-step"
import { FinancialMomentStep } from "@/components/onboarding/steps/financial-moment-step"
import { BudgetWeightStep } from "@/components/onboarding/steps/budget-weight-step"
import { FirstGoalStep } from "@/components/onboarding/steps/first-goal-step"
import { APP_HOME } from "@/lib/routes"
import type { OnboardingAnswers } from "@/lib/onboarding-personalization"
import type { BudgetWeight, FinancialObjective } from "@/lib/types"
import { useStore } from "@/lib/store"
import { TOAST } from "@/lib/copy"
import { toast } from "sonner"

const TOTAL_STEPS = 4

export default function OnboardingPage() {
  return (
    <OnboardingGuard>
      <OnboardingWizard />
    </OnboardingGuard>
  )
}

function OnboardingWizard() {
  const router = useRouter()
  const { finishOnboarding, completeOnboarding } = useStore()
  const [step, setStep] = useState(1)
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>({})

  function finish(goal?: OnboardingAnswers["goal"]) {
    if (!answers.income?.incomeType || !answers.objective || !answers.budgetWeight) {
      completeOnboarding()
      router.replace(APP_HOME)
      return
    }

    finishOnboarding({
      income: answers.income,
      objective: answers.objective,
      budgetWeight: answers.budgetWeight,
      goal,
    })

    toast.success(TOAST.success.onboardingDone)
    router.replace(APP_HOME)
  }

  function goNext() {
    if (step < TOTAL_STEPS) setStep((current) => current + 1)
  }

  return (
    <OnboardingShell step={step}>
      <OnboardingProgress step={step} total={TOTAL_STEPS} />

      {step === 1 ? (
        <IncomeStep
          onContinue={(income) => {
            setAnswers((current) => ({ ...current, income }))
            goNext()
          }}
          onSkip={goNext}
        />
      ) : null}

      {step === 2 ? (
        <FinancialMomentStep
          onContinue={(objective: FinancialObjective) => {
            setAnswers((current) => ({ ...current, objective }))
            goNext()
          }}
          onSkip={goNext}
        />
      ) : null}

      {step === 3 ? (
        <BudgetWeightStep
          onContinue={(budgetWeight: BudgetWeight) => {
            setAnswers((current) => ({ ...current, budgetWeight }))
            goNext()
          }}
          onSkip={goNext}
        />
      ) : null}

      {step === 4 ? <FirstGoalStep onFinish={finish} /> : null}
    </OnboardingShell>
  )
}