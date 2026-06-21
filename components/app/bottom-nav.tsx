"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BrandMark } from "@/components/brand-logo"
import { type NavItem } from "@/lib/nav"
import { resolveVisibleNav } from "@/lib/nav-visibility"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { useRipple } from "@/hooks/use-ripple"

function isActiveRoute(pathname: string, href: string) {
 return pathname === href || pathname.startsWith(`${href}/`)
}

export function BottomNav() {
 const pathname = usePathname()
 const { transactions, goals, investments, subscriptions, installments } = useStore()
 const { primary } = useMemo(
  () => resolveVisibleNav({ transactions, goals, investments, subscriptions, installments }),
  [transactions, goals, investments, subscriptions, installments],
 )

 return (
  <nav
   aria-label="Navegação principal"
   className="bottom-nav fixed left-1/2 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 w-[min(calc(100dvw-1rem),28rem)] -translate-x-1/2 md:hidden"
  >
   <div className="mx-auto grid h-[clamp(4rem,18vw,4.5rem)] w-full grid-cols-5 items-center gap-0 rounded-[clamp(1rem,4vw,1.5rem)] bg-sidebar/95 px-[clamp(0.25rem,1.5vw,0.5rem)] ring-1 ring-sidebar-border/80 backdrop-blur-xl min-[390px]:gap-1">
    {primary.slice(0, 2).map((item) => (
     <NavLink key={item.href} item={item} pathname={pathname} />
    ))}

    <div
     aria-hidden="true"
     className="pointer-events-none relative z-10 mx-auto flex size-[clamp(3rem,13vw,3.5rem)] -translate-y-[clamp(1.125rem,5vw,1.375rem)] items-center justify-center"
    >
     <BrandMark className="size-full bg-transparent" />
    </div>

    {primary.slice(2, 4).map((item) => (
     <NavLink key={item.href} item={item} pathname={pathname} />
    ))}
   </div>
  </nav>
 )
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
 const active = isActiveRoute(pathname, item.href)
 const Icon = item.icon
 const createRipple = useRipple<HTMLAnchorElement>()

 return (
  <Link
   href={item.href}
   data-bottom-nav-item
   aria-label={item.label}
   aria-current={active ? "page" : undefined}
   onPointerDown={createRipple}
   className={cn(
    "app-ripple-surface relative flex h-[clamp(2.75rem,13vw,3.25rem)] min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-2 outline-none transition-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
    active
     ? "bg-primary/15 text-primary"
     : "text-sidebar-foreground/55 hover:text-sidebar-foreground",
   )}
  >
   <Icon className="size-[clamp(1.125rem,5vw,1.3125rem)] shrink-0" />
   <span className="max-w-full truncate text-[9px] font-medium leading-none">{item.label}</span>
  </Link>
 )
}