"use client"

import type { ReactNode } from "react"
import { FeatureCard, type FeatureCardTone } from "@/components/app/feature-card"
import { AnimatedSection } from "@/components/motion/animated-section"
import { cn } from "@/lib/utils"

type MetricCardProps = {
 label: ReactNode
 value: ReactNode
 icon: ReactNode
 helper?: ReactNode
 delay?: number
 tone?: string
 helperTone?: string
 iconTone?: string
 className?: string
 contentClassName?: string
 labelClassName?: string
 valueClassName?: string
 iconClassName?: string
 surface?: "open" | "card"
 featureTone?: FeatureCardTone
}

export function MetricGrid({
 className,
 children,
 variant = "strip",
}: {
 className?: string
 children: ReactNode
 variant?: "strip" | "cards"
}) {
 if (variant === "cards") {
  return <div className={cn("grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2", className)}>{children}</div>
 }

 return (
  <div className={cn("app-metric-strip grid min-w-0 grid-cols-1 sm:grid-cols-2", className)}>
   {children}
  </div>
 )
}

export function MetricAutoGrid({
 className,
 children,
 variant = "strip",
}: {
 className?: string
 children: ReactNode
 variant?: "strip" | "cards"
}) {
 return (
  <div
   className={cn(variant === "cards" ? "grid min-w-0 gap-3" : "app-metric-strip grid min-w-0", className)}
   style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13rem), 1fr))" }}
  >
   {children}
  </div>
 )
}

export function MetricBody({
 label,
 value,
 icon,
 helper,
 tone = "text-foreground",
 helperTone,
 iconTone = "bg-primary/10 text-primary",
 contentClassName,
 labelClassName,
 valueClassName,
 iconClassName,
}: Omit<MetricCardProps, "delay" | "className">) {
 return (
  <div className={cn("flex min-w-0 items-center gap-3", contentClassName)}>
   <span
    className={cn(
     "flex size-9 shrink-0 items-center justify-center rounded-2xl sm:size-10",
     iconTone,
     iconClassName,
    )}
   >
    {icon}
   </span>
   <div className="min-w-0 flex-1">
    <p
     className={cn(
      "truncate text-[11px] font-semibold uppercase leading-none text-muted-foreground",
      labelClassName,
     )}
    >
     {label}
    </p>
    <p
     className={cn(
      "mt-1 truncate text-[clamp(1rem,3.2vw,1.25rem)] font-extrabold leading-tight tabular-nums",
      tone,
      valueClassName,
     )}
    >
     {value}
    </p>
    {helper !== undefined && helper !== null ? (
     <p className={cn("mt-0.5 truncate text-[11px] font-semibold leading-tight text-muted-foreground", helperTone)}>
      {helper}
     </p>
    ) : null}
   </div>
  </div>
 )
}

export function MetricCard({
 delay = 0,
 className,
 surface = "open",
 featureTone = "neutral",
 labelClassName,
 valueClassName,
 helperTone,
 iconTone,
 ...props
}: MetricCardProps) {
 if (surface === "card") {
  return (
   <FeatureCard delay={delay} tone={featureTone} className={cn("min-h-[5.75rem] justify-center p-3.5 sm:p-4", className)}>
    <MetricBody
     {...props}
     labelClassName={labelClassName}
     valueClassName={cn("text-[clamp(1.05rem,2.4vw,1.35rem)]", valueClassName)}
     helperTone={helperTone}
     iconTone={iconTone}
    />
   </FeatureCard>
  )
 }

 return (
  <AnimatedSection as="div" delay={delay} className={cn("min-h-[4.75rem] justify-center p-3.5 sm:p-4", className)}>
   <MetricBody
    {...props}
    labelClassName={labelClassName}
    valueClassName={valueClassName}
    helperTone={helperTone}
    iconTone={iconTone}
   />
  </AnimatedSection>
 )
}
