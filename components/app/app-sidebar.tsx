"use client"

import type { MouseEvent } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as m from "motion/react-m"
import { useMemo, useState } from "react"
import { BrandMark } from "@/components/brand-logo"
import { SidebarToggle } from "@/components/app/sidebar-toggle"
import { useSidebarState } from "@/components/app/sidebar-context"
import { AnimatedSidebar } from "@/components/motion/animated-sidebar"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { type NavItem } from "@/lib/nav"
import { resolveVisibleNav } from "@/lib/nav-visibility"
import { matchesRoute, ROUTES } from "@/lib/routes"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { sidebarItemTransition } from "@/src/lib/animations"
import { ChevronDown, LogOut, MoreHorizontal } from "lucide-react"

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>) {
 return (
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey
 )
}

export function AppSidebar() {
 const pathname = usePathname()
 const router = useRouter()
 const { logout, transactions, goals, investments, subscriptions, installments } = useStore()
 const { isCollapsed } = useSidebarState()
 const nav = useMemo(
  () => resolveVisibleNav({ transactions, goals, investments, subscriptions, installments }),
  [transactions, goals, investments, subscriptions, installments],
 )

 function handleLogout() {
  logout()
  void import("sonner").then(({ toast }) => toast.success("Sessão encerrada."))
  router.replace("/login")
 }

 return (
  <>
   <AnimatedSidebar
    data-app-sidebar="desktop"
    aria-label="Menu principal"
    suppressHydrationWarning
    className={cn(
     "sticky top-0 z-50 hidden h-dvh max-h-dvh w-[var(--app-sidebar-width)] shrink-0 flex-col overflow-visible border-r border-sidebar-border/80 bg-sidebar/95 p-3 backdrop-blur-xl md:flex",
     isCollapsed && "px-1",
    )}
   >
    <SidebarToggle
     mode="desktop"
     className="absolute -right-3 top-7 z-[60] translate-x-1/2"
    />
    <SidebarHeader />
    <SidebarNav pathname={pathname} nav={nav} isCollapsed={isCollapsed} />
    <SidebarAccount handleLogout={handleLogout} />
   </AnimatedSidebar>
  </>
 )
}

function SidebarHeader() {
 const { isCollapsed } = useSidebarState()
 const pathname = usePathname()
 const active = matchesRoute(pathname, ROUTES.dashboard)

 return (
  <div
   className={cn(
    "app-sidebar-header flex h-16 items-center gap-2 px-3",
    isCollapsed && "justify-center gap-0 px-0",
   )}
  >
   <Link
    href={ROUTES.dashboard}
    aria-label="PoupaByte"
    aria-current={active ? "page" : undefined}
    onClick={(event) => {
     if (!isPlainLeftClick(event)) return
    }}
    className={cn(
     "app-sidebar-brand flex min-w-0 flex-none items-center gap-2.5 rounded-2xl outline-none transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/35",
     isCollapsed && "w-10 justify-center gap-0",
    )}
   >
    <BrandMark
     className={cn(
      "app-sidebar-brand-mark h-11 w-11 shrink-0",
      isCollapsed && "h-10 w-10",
     )}
    />
    <span className="app-sidebar-logo-text app-sidebar-text overflow-hidden whitespace-nowrap text-2xl font-extrabold text-foreground">
     Poupa<span className="text-primary">Byte</span>
    </span>
   </Link>
  </div>
 )
}

function SidebarNav({
 pathname,
 nav,
 isCollapsed,
}: {
 pathname: string
 nav: ReturnType<typeof resolveVisibleNav>
 isCollapsed: boolean
}) {
 const [moreOpen, setMoreOpen] = useState(false)
 const moreActive = nav.more.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))

 return (
  <nav
   className={cn(
    "app-sidebar-nav min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-1 py-4",
    isCollapsed && "px-0",
   )}
  >
   {nav.allVisible.map((item) => (
    <SidebarNavItem key={item.href} item={item} pathname={pathname} isCollapsed={isCollapsed} />
   ))}

   {nav.more.length > 0 ? (
    <Collapsible open={moreOpen || moreActive} onOpenChange={setMoreOpen} className="pt-2">
     <SidebarMoreTrigger
      isCollapsed={isCollapsed}
      isOpen={moreOpen || moreActive}
      isActive={moreActive}
     />
     <CollapsibleContent className={cn("mt-1 space-y-1", !isCollapsed && "pl-2")}>
      {nav.more.map((item) => (
       <SidebarNavItem
        key={item.href}
        item={item}
        pathname={pathname}
        isCollapsed={isCollapsed}
        nested={!isCollapsed}
       />
      ))}
     </CollapsibleContent>
    </Collapsible>
   ) : null}
  </nav>
 )
}

function SidebarMoreTrigger({
 isCollapsed,
 isOpen,
 isActive,
}: {
 isCollapsed: boolean
 isOpen: boolean
 isActive: boolean
}) {
 const trigger = (
  <CollapsibleTrigger asChild>
   <button
    type="button"
    className={cn(
     "app-sidebar-nav-link group relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold outline-none transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/35",
     isCollapsed && "mx-auto w-11 justify-center gap-0 px-0",
     isActive || isOpen
      ? "bg-sidebar-accent/80 text-sidebar-foreground"
      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground",
    )}
    aria-expanded={isOpen}
    aria-label="Mais"
   >
    <span className="app-sidebar-nav-icon flex h-8 w-8 shrink-0 items-center justify-center text-sidebar-foreground/70 group-hover:text-primary">
     {isCollapsed ? (
      <MoreHorizontal className="h-[18px] w-[18px]" />
     ) : (
      <ChevronDown className={cn("h-[18px] w-[18px] transition-transform", isOpen && "rotate-180")} />
     )}
    </span>
    <span className="app-sidebar-text min-w-0 flex-1 truncate text-left">Mais</span>
   </button>
  </CollapsibleTrigger>
 )

 if (!isCollapsed) return trigger

 return (
  <Tooltip delayDuration={300}>
   <TooltipTrigger asChild>{trigger}</TooltipTrigger>
   <TooltipContent
    side="right"
    align="center"
    sideOffset={12}
    showArrow={false}
    className="rounded-full border border-border/70 bg-background px-3.5 py-1.5 text-sm font-semibold tracking-normal text-foreground shadow-md dark:border-white/12 dark:bg-card"
   >
    Mais
   </TooltipContent>
  </Tooltip>
 )
}

function SidebarNavItem({
 item,
 pathname,
 isCollapsed,
 nested = false,
}: {
 item: NavItem
 pathname: string
 isCollapsed: boolean
 nested?: boolean
}) {
 const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
 const Icon = item.icon
 const link = (
  <m.div className={cn(isCollapsed ? "mx-auto w-12" : "w-full")} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={sidebarItemTransition}>
   <Link
    href={item.href}
    aria-label={item.label}
    aria-current={active ? "page" : undefined}
    onClick={(event) => { if (!isPlainLeftClick(event)) return }}
    className={cn(
     "app-sidebar-nav-link group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold outline-none transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/35",
     isCollapsed && "mx-auto w-11 justify-center gap-0 px-0",
     nested && !isCollapsed && "h-10 pl-4",
     active ? "bg-primary text-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground",
    )}
   >
    <span className={cn("app-sidebar-nav-icon flex h-8 w-8 shrink-0 items-center justify-center transition-colors", active ? "text-primary-foreground" : "text-sidebar-foreground/70 group-hover:text-primary")}>
     <Icon className="h-[18px] w-[18px]" />
    </span>
    <span className="app-sidebar-text min-w-0 flex-1 truncate">{item.label}</span>
    {active && !isCollapsed ? <span className="app-sidebar-active-dot h-2 w-2 shrink-0 rounded-full bg-white" /> : null}
   </Link>
  </m.div>
 )

 return (
  <Tooltip delayDuration={300}>
   <TooltipTrigger asChild>{link}</TooltipTrigger>
   <TooltipContent side="right" align="center" sideOffset={12} hidden={!isCollapsed} showArrow={false} className="rounded-full border border-border/70 bg-background px-3.5 py-1.5 text-sm font-semibold tracking-normal text-foreground shadow-md dark:border-white/12 dark:bg-card">
    {item.label}
   </TooltipContent>
  </Tooltip>
 )
}

function SidebarAccount({ handleLogout }: { handleLogout: () => void }) {
 const { isCollapsed } = useSidebarState()

 const logoutButton = (
  <m.div
   className={cn(isCollapsed ? "mx-auto w-11" : "w-full")}
   whileHover={{ scale: 1.02 }}
   whileTap={{ scale: 0.98 }}
   transition={sidebarItemTransition}
  >
   <Button
    variant="ghost"
    className={cn(
     "h-11 w-full justify-start gap-3 rounded-2xl px-3 text-sm font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
     isCollapsed && "mx-auto w-11 justify-center gap-0 px-0",
    )}
    onClick={handleLogout}
    aria-label="Sair"
   >
    <LogOut className="h-4 w-4 shrink-0" />
    <span className="app-sidebar-text truncate">Sair</span>
   </Button>
  </m.div>
 )

 return (
  <div className={cn("app-sidebar-footer p-1", isCollapsed && "px-0")}>
   <Tooltip delayDuration={300}>
    <TooltipTrigger asChild>{logoutButton}</TooltipTrigger>
    <TooltipContent
     side="right"
     align="center"
     sideOffset={12}
     hidden={!isCollapsed}
     showArrow={false}
     className="rounded-full border border-border/70 bg-background px-3.5 py-1.5 text-sm font-semibold tracking-normal text-foreground shadow-md dark:border-white/12 dark:bg-card"
    >
     Sair
    </TooltipContent>
   </Tooltip>
  </div>
 )
}