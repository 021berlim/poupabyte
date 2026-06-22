"use client"

import type { MouseEvent } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as m from "motion/react-m"
import { useMemo } from "react"
import { BrandMark } from "@/components/brand-logo"
import { useSidebarState } from "@/components/app/sidebar-context"
import { AnimatedSidebar } from "@/components/motion/animated-sidebar"
import { Button } from "@/components/ui/button"
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
import { matchesRoute, ROUTES } from "@/lib/routes"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { sidebarItemTransition } from "@/src/lib/animations"
import { LogOut } from "lucide-react"

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>) {
 return (
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey
 )
}

export function MobileSidebarSheet({ handleLogout }: { handleLogout: () => void }) {
 const pathname = usePathname()
 const { mobileOpen, setMobileOpen } = useSidebarState()
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

 return (
  <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
   <SheetContent
    side="left"
    className="h-dvh max-h-dvh w-[min(88dvw,20rem)] max-w-none gap-0 border-sidebar-border/80 bg-sidebar/95 p-0 text-sidebar-foreground backdrop-blur-xl [&>button]:hidden"
   >
    <SheetHeader className="sr-only">
     <SheetTitle>Menu PoupaByte</SheetTitle>
     <SheetDescription>Navegação principal do PoupaByte.</SheetDescription>
    </SheetHeader>
    <AnimatedSidebar as="div" data-app-sidebar="mobile" className="flex h-dvh min-h-0 w-full flex-col p-[clamp(0.75rem,3vw,1rem)] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
     <MobileSidebarHeader onNavigate={() => setMobileOpen(false)} />
     <MobileSidebarNav pathname={pathname} items={nav.allVisible} onNavigate={() => setMobileOpen(false)} />
     {nav.more.length > 0 ? (
      <>
       <Separator className="my-2" />
       <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/45">Mais</p>
       <MobileSidebarNav pathname={pathname} items={nav.more} onNavigate={() => setMobileOpen(false)} />
      </>
     ) : null}
     <MobileSidebarAccount handleLogout={handleLogout} />
    </AnimatedSidebar>
   </SheetContent>
  </Sheet>
 )
}

function MobileSidebarHeader({ onNavigate }: { onNavigate: () => void }) {
 const pathname = usePathname()
 const active = matchesRoute(pathname, ROUTES.dashboard)

 return (
  <div className="app-sidebar-header flex h-16 items-center gap-2 px-3">
   <Link
    href={ROUTES.dashboard}
    aria-label="PoupaByte"
    aria-current={active ? "page" : undefined}
    onClick={(event) => {
     if (!isPlainLeftClick(event)) return
     onNavigate()
    }}
    className="app-sidebar-brand flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl outline-none transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/35"
   >
    <BrandMark className="app-sidebar-brand-mark h-11 w-11 shrink-0" />
    <span className="app-sidebar-logo-text app-sidebar-text overflow-hidden whitespace-nowrap text-2xl font-extrabold text-foreground">
     Poupa<span className="text-primary">Byte</span>
    </span>
   </Link>
  </div>
 )
}

function MobileSidebarNav({
 pathname,
 items,
 onNavigate,
}: {
 pathname: string
 items: NavItem[]
 onNavigate: () => void
}) {
 return (
  <nav className="app-sidebar-nav min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-1 py-2">
   {items.map((item) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
    const Icon = item.icon

    return (
     <m.div
      key={item.href}
      className="w-full"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={sidebarItemTransition}
     >
      <Link
       href={item.href}
       aria-label={item.label}
       aria-current={active ? "page" : undefined}
       onClick={(event) => {
        if (!isPlainLeftClick(event)) return
        onNavigate()
       }}
       className={cn(
        "app-sidebar-nav-link group relative flex h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold outline-none transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/35",
        active
         ? "bg-primary text-primary-foreground"
         : "text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground",
       )}
      >
       <span
        className={cn(
         "app-sidebar-nav-icon flex h-8 w-8 shrink-0 items-center justify-center transition-colors",
         active ? "text-primary-foreground" : "text-sidebar-foreground/70 group-hover:text-primary",
        )}
       >
        <Icon className="h-[18px] w-[18px]" />
       </span>
       <span className="app-sidebar-text min-w-0 flex-1 truncate">{item.label}</span>
       {active && <span className="app-sidebar-active-dot h-2 w-2 shrink-0 rounded-full bg-white" />}
      </Link>
     </m.div>
    )
   })}
  </nav>
 )
}

function MobileSidebarAccount({ handleLogout }: { handleLogout: () => void }) {
 return (
  <div className="app-sidebar-footer p-1">
   <m.div
    className="w-full"
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    transition={sidebarItemTransition}
   >
    <Button
     variant="ghost"
     className="h-11 w-full justify-start gap-3 rounded-2xl px-3 text-sm font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
     onClick={handleLogout}
     aria-label="Sair"
    >
     <LogOut className="h-4 w-4 shrink-0" />
     <span className="app-sidebar-text truncate">Sair</span>
    </Button>
   </m.div>
  </div>
 )
}