import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface StatItem {
 label: string
 value: ReactNode
 /** Descriptive line below the metric value */
 detail: ReactNode
 tone?: string
}

export function StatStrip({ items, className }: { items: StatItem[]; className?: string }) {
 return (
  <dl
   className={cn(
    "app-metric-strip grid min-w-0 grid-cols-1 sm:grid-cols-2 lg:[grid-template-columns:repeat(var(--stat-columns),minmax(0,1fr))]",
    className,
   )}
   style={{ "--stat-columns": items.length } as CSSProperties}
  >
   {items.map((item) => (
     <div key={item.label} className="app-metric-item min-w-0 px-1 py-4 sm:px-[clamp(1rem,2.5vw,2rem)] lg:first:pl-0 lg:last:pr-0">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{item.label}</dt>
      <dd className={cn("mt-2 text-[clamp(1.25rem,3vw,1.75rem)] font-extrabold leading-none tabular-nums", item.tone)}>
       {item.value}
      </dd>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p>
     </div>
   ))}
  </dl>
 )
}
