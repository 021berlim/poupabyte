"use client"

export function OnboardingProgress({ step, total }: { step: number; total: number }) {
  const progress = (step / total) * 100

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>
          Passo {step} de {total}
        </span>
        <span className="tabular-nums">{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}