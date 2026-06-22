"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { BrandMark } from "@/components/brand-logo"
import { Separator } from "@/components/ui/separator"
import {
 Sheet,
 SheetContent,
 SheetDescription,
 SheetHeader,
 SheetTitle,
} from "@/components/ui/sheet"
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
 const [moreOpen, setMoreOpen] = useState(false)
 const { transactions, goals, investments, subscriptions, installments, financialProfile } = useStore()
 const nav = useMemo(
  () =>
   resolveVisibleNav({
    transactions,
    goals,
    investments,
    subscriptions,
    installments,
    objective: financialProfile.objective,
    profileConfigured: financialProfile.configured,
   }),
  [transactions, goals, investments, subscriptions, installments, financialProfile.objective, financialProfile.configured],
 )

 const barItems = nav.primary.slice(0, 3)
 const moreItems = useMemo(() => {
  const inBar = new Set(barItems.map((item) => item.href))
  return [...nav.primary.slice(3), ...nav.promoted, ...nav.more].filter(
   (item) => !inBar.has(item.href),
  )
 }, [nav, barItems])

 const moreActive = moreItems.some((item) => isActiveRoute(pathname, item.href))
 const createMoreRipple = useRipple<HTMLButtonElement>()

 return (
  <>
   <nav
    aria-label="Navegação principal"
    className="bottom-nav fixed left-1/2 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 w-[min(calc(100dvw-1rem),28rem)] -translate-x-1/2 md:hidden"
   >
    <div className="mx-auto grid h-[clamp(4rem,18vw,4.5rem)] w-full grid-cols-5 items-center gap-0 rounded-[clamp(1rem,4vw,1.5rem)] bg-sidebar/95 px-[clamp(0.25rem,1.5vw,0.5rem)] ring-1 ring-sidebar-border/80 backdrop-blur-xl min-[390px]:gap-1">
     {barItems.slice(0, 2).map((item) => (
      <NavLink key={item.href} item={item} pathname={pathname} />
     ))}

     <div
      aria-hidden="true"
      className="pointer-events-none relative z-10 mx-auto flex size-[clamp(3rem,13vw,3.5rem)] -translate-y-[clamp(1.125rem,5vw,1.375rem)] items-center justify-center"
     >
      <BrandMark className="size-full bg-transparent" />
     </div>

     {barItems.slice(2, 3).map((item) => (
      <NavLink key={item.href} item={item} pathname={pathname} />
     ))}

     <button
      type="button"
      data-bottom-nav-item
      aria-label="Mais opções"
      aria-expanded={moreOpen}
      onClick={() => setMoreOpen(true)}
      onPointerDown={createMoreRipple}
      className={cn(
       "app-ripple-surface relative flex h-[clamp(2.75rem,13vw,3.25rem)] min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-2 outline-none transition-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
       moreActive || moreOpen
        ? "bg-primary/15 text-primary"
        : "text-sidebar-foreground/55 hover:text-sidebar-foreground",
      )}
     >
      <Menu className="size-[clamp(1.125rem,5vw,1.3125rem)] shrink-0" />
      <span className="max-w-full truncate text-[9px] font-medium leading-none">Mais</span>
     </button>
    </div>
   </nav>

   <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
    <SheetContent
     side="responsive"
     className="app-responsive-filter-sheet overflow-hidden md:hidden"
    >
     <SheetHeader className="border-b px-6 py-5 pr-12 text-left">
      <SheetTitle>Mais opções</SheetTitle>
      <SheetDescription>Mais telas do app.</SheetDescription>
     </SheetHeader>
     <div className="app-responsive-modal-body flex flex-col px-2 py-2">
      {moreItems.map((item, index) => {
       const active = isActiveRoute(pathname, item.href)

       return (
        <div key={item.href}>
         <MoreNavLink item={item} active={active} onNavigate={() => setMoreOpen(false)} />
         {index < moreItems.length - 1 && <Separator />}
        </div>
       )
      })}
     </div>
    </SheetContent>
   </Sheet>
  </>
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

function MoreNavLink({
 item,
 active,
 onNavigate,
}: {
 item: NavItem
 active: boolean
 onNavigate: () => void
}) {
 const Icon = item.icon
 const createRipple = useRipple<HTMLAnchorElement>()

 return (
  <Link
   href={item.href}
   aria-current={active ? "page" : undefined}
   onClick={onNavigate}
   onPointerDown={createRipple}
   className={cn(
    "app-ripple-surface flex min-h-12 items-center gap-3 rounded-xl px-2 py-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/35",
    active ? "bg-primary/10 text-primary" : "text-foreground",
   )}
  >
   <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
   <span>{item.label}</span>
  </Link>
 )
}