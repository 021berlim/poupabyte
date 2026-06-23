"use client"

import { useState } from "react"
import { Banner } from "@/components/app/banner"
import { getDashboardFocus } from "@/lib/onboarding-personalization"
import { ROUTES } from "@/lib/routes"
import type { FinancialProfile } from "@/lib/types"
import { dismissUi, isUiDismissed, UI_DISMISS_KEYS } from "@/lib/ui-dismiss"
import { Lightbulb } from "lucide-react"

export function PersonalizedWelcome({
  profile,
  limitsCount = 0,
}: {
  profile: FinancialProfile
  limitsCount?: number
}) {
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== "undefined" ? isUiDismissed(UI_DISMISS_KEYS.limitsTip) : false,
  )

  if (!profile.configured) return null

  const focus = getDashboardFocus(profile.objective, profile.budgetWeight, profile.incomeType)
  const showLimitsTip = focus.showLimitsProminent && limitsCount === 0

  if (!showLimitsTip || dismissed) return null

  return (
    <Banner
      icon={Lightbulb}
      accent="warning"
      actionHref={ROUTES.limits}
      actionLabel="Criar limite"
      onDismiss={() => {
        dismissUi(UI_DISMISS_KEYS.limitsTip)
        setDismissed(true)
      }}
    >
      Você ainda não definiu limites este mês.
    </Banner>
  )
}

