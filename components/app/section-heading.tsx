import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function SectionHeading({
 eyebrow,
 title,
 subtitle,
 action,
 className,
}: {
 eyebrow?: string
 title: string
 subtitle?: string
 action?: ReactNode
 className?: string
}) {
 return (
  <div className={cn("mb-3 flex items-end justify-between gap-4", className)}>
   <div className="min-w-0 space-y-1">
    {eyebrow ? (
     <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{eyebrow}</p>
    ) : null}
    <h2 className={cn("text-xl font-extrabold text-foreground", !eyebrow && "text-sm font-medium")}>
     {title}
    </h2>
    {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
   </div>
   {action ? <div className="shrink-0">{action}</div> : null}
  </div>
 )
}