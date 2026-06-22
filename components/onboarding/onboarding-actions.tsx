"use client"

import { Button } from "@/components/ui/button"

export function OnboardingActions({
  onContinue,
  onSkip,
  continueLabel = "Continuar",
  skipLabel = "Pular",
  loading = false,
  continueDisabled = false,
}: {
  onContinue: () => void
  onSkip: () => void
  continueLabel?: string
  skipLabel?: string
  loading?: boolean
  continueDisabled?: boolean
}) {
  return (
    <div className="mt-4">
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={onContinue}
        disabled={loading || continueDisabled}
      >
        {loading ? (
          <>
            <span className="sr-only">Carregando</span>
            <span aria-hidden="true" className="h-4 w-24 animate-pulse rounded bg-primary-foreground/70" />
          </>
        ) : (
          continueLabel
        )}
      </Button>
      <p className="mt-3 text-center text-sm text-muted-foreground">
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