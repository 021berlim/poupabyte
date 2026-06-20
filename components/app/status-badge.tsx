import type { ReactNode } from "react"
import { AlertTriangle, CheckCircle2, CircleAlert, Info } from "lucide-react"
import { cn } from "@/lib/utils"

type StatusTone = "success" | "warning" | "danger" | "neutral"

const toneClasses: Record<StatusTone, string> = {
 success: "border-success/25 bg-success/10 text-success",
 warning: "border-primary/25 bg-primary/10 text-primary",
 danger: "border-destructive/25 bg-destructive/10 text-destructive",
 neutral: "border-border bg-muted/60 text-muted-foreground",
}

const toneIcons: Record<StatusTone, typeof Info> = {
 success: CheckCircle2,
 warning: AlertTriangle,
 danger: CircleAlert,
 neutral: Info,
}

export function StatusBadge({
 children,
 tone = "neutral",
 icon,
 className,
}: {
 children: ReactNode
 tone?: StatusTone
 icon?: ReactNode
 className?: string
}) {
 const Icon = toneIcons[tone]

 return (
  <span
   className={cn(
    "inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold leading-none",
    toneClasses[tone],
    className,
   )}
  >
   {icon ?? <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
   <span className="truncate">{children}</span>
  </span>
 )
}
