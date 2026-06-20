import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

type AccentTone = "primary" | "destructive"

const ACCENT_TONE: Record<AccentTone, string> = {
  primary: "bg-primary",
  destructive: "bg-destructive",
}

export function InsightListRow({
  href,
  accent = "primary",
  icon,
  title,
  subtitle,
  trailing,
  showArrow = Boolean(href),
  onClick,
}: {
  href?: string
  accent?: AccentTone
  icon: ReactNode
  title: string
  subtitle: string
  trailing?: ReactNode
  showArrow?: boolean
  onClick?: () => void
}) {
  const content = (
    <>
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
      {showArrow && href ? <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
    </>
  )

  const rowClass = "app-row-hover flex h-full min-h-[4.5rem] min-w-0 items-center gap-3 px-1 py-4"

  return (
    <div className="flex h-full w-full items-stretch divide-x-0">
      <span
        aria-hidden
        className={cn("w-1 shrink-0 self-stretch rounded-full", ACCENT_TONE[accent])}
      />
      {href ? (
        <Link href={href} className={rowClass}>
          {content}
        </Link>
      ) : (
        <div className={rowClass} onClick={onClick} role={onClick ? "button" : undefined}>
          {content}
        </div>
      )}
    </div>
  )
}