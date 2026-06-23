import Link from "next/link"
import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  trailingSub,
  progress,
  progressTone,
  progressLabel,
  href,
  onClick,
  footer,
  className,
}: {
  icon: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  trailingSub?: ReactNode
  progress?: number
  progressTone?: string
  progressLabel?: string
  href?: string
  onClick?: () => void
  footer?: ReactNode
  className?: string
}) {
  const content = (
    <>
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold sm:text-base">{title}</h2>
            {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          {trailing !== undefined ? (
            <div className="shrink-0 text-right">
              <p className="font-extrabold tabular-nums">{trailing}</p>
              {trailingSub ? <p className="mt-1 text-xs text-muted-foreground">{trailingSub}</p> : null}
            </div>
          ) : null}
        </div>
        {progress !== undefined ? (
          <Progress
            value={Math.min(100, progress)}
            aria-label={progressLabel ?? `${progress}%`}
            className={cn("mt-4 h-2.5", progressTone)}
          />
        ) : null}
        {footer}
      </div>
      {href ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
    </>
  )

  const rowClass = cn(
    "app-row-hover flex min-h-11 items-start gap-3 px-1 py-4 sm:min-h-[3rem] sm:py-5",
    className,
  )

  if (href) {
    return (
      <Link href={href} className={rowClass}>
        {content}
      </Link>
    )
  }

  return (
    <div className={rowClass} onClick={onClick} role={onClick ? "button" : undefined}>
      {content}
    </div>
  )
}