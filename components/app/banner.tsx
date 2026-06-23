import Link from "next/link"
import type { LucideIcon, ReactNode } from "react"
import { ArrowRight, X } from "lucide-react"
import { cn } from "@/lib/utils"

type BannerAccent = "primary" | "warning" | "success"

const ACCENT_CLASS: Record<BannerAccent, string> = {
  primary: "bg-primary",
  warning: "bg-warning",
  success: "bg-success",
}

export function Banner({
  icon: Icon,
  children,
  actionHref,
  actionLabel,
  onDismiss,
  accent = "primary",
  className,
}: {
  icon: LucideIcon
  children: ReactNode
  actionHref?: string
  actionLabel?: string
  onDismiss?: () => void
  accent?: BannerAccent
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-11 w-full items-center gap-2.5 border-y border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4",
        className,
      )}
    >
      <span aria-hidden className={cn("h-8 w-1 shrink-0 rounded-full", ACCENT_CLASS[accent])} />
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-xs leading-snug text-foreground/90 sm:text-sm">{children}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline sm:text-sm"
        >
          {actionLabel}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      ) : null}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          aria-label="Dispensar aviso"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}