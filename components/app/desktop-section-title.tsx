"use client"

import { usePathname } from "next/navigation"
import { useSectionHeader } from "@/components/app/section-header-context"
import { NAV_ITEMS } from "@/lib/nav"
import { matchesRoute, ROUTES } from "@/lib/routes"
import { useStore } from "@/lib/store"

function greeting() {
 const h = new Date().getHours()
 if (h < 12) return "Bom dia"
 if (h < 18) return "Boa tarde"
 return "Boa noite"
}

function sectionTitle(pathname: string) {
 if (matchesRoute(pathname, ROUTES.profile)) return "Minha conta"

 const current = NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
 return current?.label ?? "PoupaByte"
}

export function DesktopSectionTitle() {
 const pathname = usePathname()
 const { header } = useSectionHeader()
 const { user } = useStore()
 const hasRegisteredHeader =
  Boolean(header.title) && header.path === pathname && header.ownerId !== undefined

 if (!hasRegisteredHeader && matchesRoute(pathname, ROUTES.dashboard)) {
  const firstName = user?.name.split(" ")[0] ?? "PoupaByte"

  return (
   <div className="flex min-w-0 items-center justify-between gap-6">
    <div className="min-w-0">
     <h1 className="truncate text-[clamp(1.75rem,2.6vw,2.5rem)] font-extrabold leading-tight tracking-tight text-foreground">
      {greeting()}, {firstName}
     </h1>
    </div>
   </div>
  )
 }

 const title = header.title ?? sectionTitle(pathname)

 return (
  <div className="flex min-w-0 items-center justify-between gap-6">
   <div className="min-w-0 flex-1 space-y-1">
    <h1 className="truncate text-[clamp(1.5rem,2.3vw,2rem)] font-extrabold leading-[1.05] tracking-tight text-foreground">
     {title}
    </h1>
    {header.subtitle && (
     <p className="max-w-[min(58vw,52rem)] truncate text-sm leading-5 text-muted-foreground">
      {header.subtitle}
     </p>
    )}
   </div>
   {header.action && <div className="flex shrink-0 items-center justify-end gap-2">{header.action}</div>}
  </div>
 )
}
