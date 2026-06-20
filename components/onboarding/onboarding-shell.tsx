"use client"

import { AuthShell } from "@/components/auth/auth-shell"
import type { ReactNode } from "react"

/** Wrapper fino — reutiliza o mesmo layout visual de login e cadastro. */
export function OnboardingShell({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>
}

export function OnboardingStepHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-[clamp(1.5rem,6vw,1.75rem)] font-extrabold tracking-tight">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}