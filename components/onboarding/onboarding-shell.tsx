"use client"

import { BrandLogo } from "@/components/brand-logo"
import { cn } from "@/lib/utils"
import { ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react"
import type { ReactNode } from "react"

const ONBOARDING_STEPS = [
  { id: 1, label: "Renda" },
  { id: 2, label: "Objetivo" },
  { id: 3, label: "Orçamento" },
  { id: 4, label: "Meta" },
] as const

const FEATURES = [
  { icon: TrendingUp, text: "Veja para onde seu dinheiro vai" },
  { icon: Target, text: "Acompanhe limites e metas" },
  { icon: ShieldCheck, text: "Receba análises da Penny quando precisar" },
] as const

export function OnboardingShell({
  children,
  step = 1,
}: {
  children: ReactNode
  step?: number
}) {
  return (
    <div className="flex min-h-dvh w-full overflow-x-hidden bg-background">
      {/* Painel de marca — inspirado em fintech split-screen */}
      <aside className="relative hidden w-[44%] shrink-0 flex-col justify-between overflow-hidden bg-secondary p-[clamp(2rem,4vw,3.25rem)] text-secondary-foreground xl:w-[42%] lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(var(--secondary-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--secondary-foreground) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-[28rem] w-[28rem] rounded-full bg-primary/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-success/20 blur-3xl"
        />

        <div className="relative">
          <BrandLogo size="lg" iconVariant="white" className="[&_span]:text-white" />
        </div>

        <div className="relative max-w-lg space-y-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Configuração inicial
            </p>
            <h1 className="mt-3 text-balance text-[clamp(2rem,3.5vw,2.75rem)] font-extrabold leading-[1.08] tracking-tight">
              Suas finanças, do seu jeito.
            </h1>
            <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-secondary-foreground/75">
              Organize entradas, gastos e metas em uma visão simples do seu mês.
            </p>
          </div>

          <ol className="space-y-3" aria-label="Etapas do onboarding">
            {ONBOARDING_STEPS.map((item) => {
              const active = item.id === step
              const done = item.id < step
              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
                    active
                      ? "border-primary/40 bg-white/10 shadow-[inset_3px_0_0_0_var(--primary)]"
                      : done
                        ? "border-white/10 bg-white/5"
                        : "border-transparent bg-transparent opacity-55",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold tabular-nums",
                      active
                        ? "bg-primary text-primary-foreground"
                        : done
                          ? "bg-success/90 text-success-foreground"
                          : "bg-white/10 text-secondary-foreground/80",
                    )}
                  >
                    {done ? "✓" : item.id}
                  </span>
                  <span className={cn("text-sm font-semibold", active && "text-white")}>
                    {item.label}
                  </span>
                </li>
              )
            })}
          </ol>

          <ul className="space-y-3.5 border-t border-white/10 pt-6">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-secondary-foreground/85">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Icon className="size-[1.125rem]" strokeWidth={2.25} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-secondary-foreground/45">
          PoupaByte — Demonstração. Dados simulados, sem integração bancária real.
        </p>
      </aside>

      {/* Painel do formulário */}
      <main className="relative flex min-h-dvh min-w-0 flex-1 flex-col bg-[#f0f3f8] dark:bg-background">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/[0.04] to-transparent lg:hidden"
        />

        <header className="relative flex items-center justify-between px-[clamp(1rem,5vw,2rem)] pb-2 pt-[max(1rem,env(safe-area-inset-top))] lg:hidden">
          <BrandLogo size="sm" />
          <span className="rounded-full bg-card px-3 py-1 text-xs font-bold tabular-nums text-muted-foreground shadow-sm ring-1 ring-border/60">
            {step}/{ONBOARDING_STEPS.length}
          </span>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-[clamp(1rem,5vw,2rem)] py-5 lg:py-10">
          <div className="w-full max-w-[26rem] min-w-0">
            <div className="rounded-[1.35rem] border border-border/80 bg-card p-[clamp(1.25rem,4vw,2rem)] shadow-[0_12px_48px_-16px_rgba(27,37,51,0.18)] ring-1 ring-black/[0.03] dark:shadow-none dark:ring-border/60">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export function OnboardingStepHeader({
  title,
  description,
  step,
  totalSteps = 4,
}: {
  title: string
  description?: string
  step?: number
  totalSteps?: number
}) {
  return (
    <header className="space-y-2">
      {step ? (
        <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Passo {step} de {totalSteps}
        </p>
      ) : null}
      <h2 className="text-balance text-[clamp(1.4rem,4.5vw,1.75rem)] font-extrabold leading-tight tracking-tight">
        {title}
      </h2>
      {description ? (
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </header>
  )
}

export function OnboardingPennyTip({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-primary/15 bg-accent/60 px-3.5 py-3 dark:bg-primary/10">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Sparkles className="size-4" aria-hidden="true" />
      </span>
      <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
    </div>
  )
}

export function OnboardingFieldHelp({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
}