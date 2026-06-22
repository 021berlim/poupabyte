"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getDashboardFocus } from "@/lib/onboarding-personalization"
import type { FinancialProfile } from "@/lib/types"
import { ArrowRight, Sparkles } from "lucide-react"

export function PersonalizedWelcome({
  profile,
  onAskPenny,
}: {
  profile: FinancialProfile
  onAskPenny?: () => void
}) {
  if (!profile.configured) return null

  const focus = getDashboardFocus(profile.objective, profile.budgetWeight)

  return (
    <section className="rounded-[clamp(1rem,3vw,1.25rem)] border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-extrabold tracking-tight">{focus.welcomeTitle}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{focus.welcomeHint}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" className="h-9 rounded-xl px-4 text-xs font-bold">
              <Link href={focus.primaryCta.href}>
                {focus.primaryCta.label}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
            {focus.secondaryCta ? (
              <Button asChild variant="outline" size="sm" className="h-9 rounded-xl px-4 text-xs font-bold">
                <Link href={focus.secondaryCta.href}>{focus.secondaryCta.label}</Link>
              </Button>
            ) : null}
            {onAskPenny ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 rounded-xl px-4 text-xs font-bold text-primary"
                onClick={onAskPenny}
              >
                {focus.pennyAnalysisPrompt}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}