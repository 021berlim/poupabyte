"use client"

import { usePathname } from "next/navigation"
import { NAV_ITEMS } from "@/lib/nav"
import { matchesRoute, ROUTES } from "@/lib/routes"

export function MobilePageTitle() {
  const pathname = usePathname()

  if (matchesRoute(pathname, ROUTES.profile)) {
    return (
      <h1 className="truncate text-base font-extrabold tracking-tight text-foreground">Minha conta</h1>
    )
  }

  const current = NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
  if (!current) return null

  return (
    <h1 className="truncate text-base font-extrabold tracking-tight text-foreground">{current.label}</h1>
  )
}