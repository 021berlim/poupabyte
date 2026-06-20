import type { ReactNode } from "react"
import { FeatureCard } from "@/components/app/feature-card"
import { cn } from "@/lib/utils"

export function FinanceHero({
 eyebrow,
 value,
 description,
 aside,
 children,
 tone = "neutral",
 className,
}: {
 eyebrow: string
 value: ReactNode
 description?: ReactNode
 aside?: ReactNode
 children?: ReactNode
 tone?: "neutral" | "positive" | "negative" | "brand"
 className?: string
}) {
 return (
  <FeatureCard
   delay={0.04}
   className={cn(
    "min-h-[13rem] justify-between overflow-hidden p-[clamp(1.25rem,4vw,2rem)]",
    tone === "positive" && "border-positive/20 bg-positive/[0.08]",
    tone === "negative" && "border-negative/20 bg-negative/[0.08]",
    tone === "brand" && "border-brand/20 bg-brand/[0.08]",
    className,
   )}
  >
   <div className="flex items-start justify-between gap-4">
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
    {aside}
   </div>
   <div className="my-6 min-w-0">
    <div className="truncate text-[clamp(2.2rem,10vw,4.5rem)] font-extrabold leading-none tracking-[-0.045em] tabular-nums">
     {value}
    </div>
    {description ? <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
   </div>
   {children}
  </FeatureCard>
 )
}
