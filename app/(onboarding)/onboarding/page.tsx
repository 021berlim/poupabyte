"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { OnboardingGuard } from "@/components/onboarding-guard"
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress"
import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { IncomeStep } from "@/components/onboarding/steps/income-step"
import { CategoriesStep, applyCategoryStepData } from "@/components/onboarding/steps/categories-step"
import { ImportStep } from "@/components/onboarding/steps/import-step"
import { APP_HOME } from "@/lib/routes"
import { useStore } from "@/lib/store"
import { toast } from "sonner"

const TOTAL_STEPS = 3

export default function OnboardingPage() {
  return (
    <OnboardingGuard>
      <OnboardingWizard />
    </OnboardingGuard>
  )
}

function OnboardingWizard() {
  const router = useRouter()
  const {
    saveOnboardingIncome,
    addUserCategorySilent,
    showSystemCategory,
    completeOnboarding,
  } = useStore()
  const [step, setStep] = useState(1)

  function finish() {
    completeOnboarding()
    toast.success("Configuração inicial concluída!", {
      description: "Seu dashboard já está pronto para uso.",
    })
    router.replace(APP_HOME)
  }

  function goNext() {
    if (step < TOTAL_STEPS) setStep((current) => current + 1)
    else finish()
  }

  return (
    <OnboardingShell>
      <OnboardingProgress step={step} total={TOTAL_STEPS} />

      {step === 1 ? (
        <IncomeStep
          onContinue={(data) => {
            if (data) saveOnboardingIncome(data)
            goNext()
          }}
          onSkip={goNext}
        />
      ) : null}

      {step === 2 ? (
        <CategoriesStep
          onContinue={(data) => {
            if (data.suggested.length > 0 || data.customNames.length > 0) {
              applyCategoryStepData(data, addUserCategorySilent, showSystemCategory)
            }
            goNext()
          }}
          onSkip={goNext}
        />
      ) : null}

      {step === 3 ? (
        <ImportStep onContinue={() => finish()} onSkip={finish} />
      ) : null}
    </OnboardingShell>
  )
}