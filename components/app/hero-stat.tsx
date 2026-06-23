import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function HeroStat({
  title,
  value,
  caption,
  aside,
  children,
  tone = "brand",
  className,
}: {
  title: string
  value: ReactNode
  caption?: ReactNode
  aside?: ReactNode
  children?: ReactNode
  tone?: "brand" | "neutral" | "positive" | "negative"
  className?: string
}) {
  const toneClass =
    tone === "brand"
      ? "bg-[#194b36] text-white dark:bg-[#143a2b]"
      : tone === "positive"
        ? "bg-success/15 text-foreground"
        : tone === "negative"
          ? "bg-destructive/10 text-foreground"
          : "bg-transparent text-foreground"

  return (
    <section
      className={cn(
        "relative -mx-[clamp(1rem,4vw,1.5rem)] flex min-w-0 flex-col px-[clamp(1rem,4vw,1.5rem)] py-[clamp(1rem,3vw,1.5rem)] sm:mx-0 sm:rounded-[clamp(1rem,3vw,1.5rem)]",
        toneClass,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className={cn(
              "text-xs font-bold uppercase tracking-wide",
              tone === "brand" ? "text-white/45" : "text-muted-foreground",
            )}
          >
            {title}
          </p>
        </div>
        {aside}
      </div>

      <div className="py-4">
        <div className="min-w-0">{value}</div>
        {caption ? (
          <p
            className={cn(
              "mt-2 text-sm font-medium",
              tone === "brand" ? "text-white/55" : "text-muted-foreground",
            )}
          >
            {caption}
          </p>
        ) : null}
      </div>

      {children}
    </section>
  )
}