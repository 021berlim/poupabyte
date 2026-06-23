"use client"

import { Button } from "@/components/ui/button"

export function OnboardingActions({
  onContinue,
  onSkip,
  continueLabel = "Continuar",
  continueDisabledLabel = "Escolha uma opção para continuar",
  skipLabel = "Pular por enquanto",
  loading = false,
  continueDisabled = false,
}: {
  onContinue: () => void
  onSkip: () => void
  continueLabel?: string
  continueDisabledLabel?: string
  skipLabel?: string
  loading?: boolean
  continueDisabled?: boolean
}) {
  const buttonLabel = continueDisabled && !loading ? continueDisabledLabel : continueLabel

  return (
    <div>
      <Button
        type="button"
        className="mt-6 w-full"
        size="lg"
        onClick={onContinue}
        disabled={loading || continueDisabled}
      >
        {loading ? (
          <>
            <span className="sr-only">Carregando</span>
            <span aria-hidden="true" className="h-4 w-28 animate-pulse rounded bg-primary-foreground/70" />
          </>
        ) : (
          buttonLabel
        )}
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <button
          type="button"
          onClick={onSkip}
          disabled={loading}
          className="font-semibold text-primary hover:underline disabled:opacity-50"
        >
          {skipLabel}
        </button>
      </p>
    </div>
  )
}