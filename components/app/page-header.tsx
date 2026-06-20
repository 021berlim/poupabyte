"use client"

import { useId, useLayoutEffect } from "react"
import { usePathname } from "next/navigation"
import { useSectionHeader } from "@/components/app/section-header-context"

export function PageHeader({
 title,
 subtitle,
 action,
}: {
 title: string
 subtitle?: string
 action?: React.ReactNode
}) {
 const pathname = usePathname()
 const ownerId = useId()
 const { setHeader } = useSectionHeader()

 useLayoutEffect(() => {
  setHeader({ ownerId, path: pathname, title, subtitle, action })

  return () => {
   setHeader((current) => (current.ownerId === ownerId ? {} : current))
  }
 }, [action, ownerId, pathname, setHeader, subtitle, title])

 return (
  <div className="flex min-w-0 flex-col gap-3 md:hidden sm:flex-row sm:items-center sm:justify-between sm:gap-4">
   <div className="min-w-0 flex-1 space-y-1.5">
    <h1 className="text-[clamp(1.5rem,6vw,2rem)] font-extrabold leading-[1.05] tracking-tight text-balance">
     {title}
    </h1>
    {subtitle && <p className="text-sm leading-5 text-muted-foreground text-pretty">{subtitle}</p>}
   </div>
   {action && (
    <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
     {action}
    </div>
   )}
  </div>
 )
}