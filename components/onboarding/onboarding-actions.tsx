"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
    <div className="mt-6 border-t border-border/60 pt-5">
      <Button
        type="button"
        size="lg"
        className={cn(
          "h-12 w-full rounded-2xl text-base font-bold shadow-[0_8px_24px_-8px_rgba(199,44,59,0.55)]",
          "transition-transform active:scale-[0.99]",
        )}
        onClick={onContinue}
        disabled={loading || continueDisabled}
      >
        {loading ? (
          <>
            <span className="sr-only">Carregando</span>
            <span aria-hidden="true" className="h-4 w-28 animate-pulse rounded-lg bg-primary-foreground/70" />
          </>
        ) : (
          buttonLabel
        )}
      </Button>
      <p className="mt-4 text-center">
        <button
          type="button"
          onClick={onSkip}
          disabled={loading}
          className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
        >
          {skipLabel}
        </button>
      </p>
    </div>
  )
}