import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function EmptyModuleCard({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode
  title: string
  description: string
  action: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "app-open-section flex flex-col items-center gap-4 rounded-[clamp(1rem,3vw,1.5rem)] border border-dashed border-border/80 px-6 py-[clamp(2.5rem,10vh,3.5rem)] text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="max-w-sm space-y-1">
        <p className="text-base font-bold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </section>
  )
}