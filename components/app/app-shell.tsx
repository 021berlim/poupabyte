"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app/app-sidebar"
import { AutoHideTopbar } from "@/components/app/auto-hide-topbar"
import { BottomNav } from "@/components/app/bottom-nav"
import { DesktopSectionTitle } from "@/components/app/desktop-section-title"
import { LazyNotificationCenter } from "@/components/app/lazy-notification-center"
import { AppCommandPalette } from "@/components/app/app-command-palette"
import { MobilePageTitle } from "@/components/app/mobile-page-title"
import { ProfileMenu } from "@/components/app/profile-menu"
import { SectionHeaderProvider } from "@/components/app/section-header-context"
import { SidebarStateProvider } from "@/components/app/sidebar-context"
import { AnimatedPage } from "@/components/motion/animated-page"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"

export function AppShell({ children }: { children: ReactNode }) {
 const pathname = usePathname()
 const isAssistant = pathname === ROUTES.assistant

 return (
  <SidebarStateProvider>
   <SectionHeaderProvider>
    <div className="app-page-root">
     <div className="app-shell-grid flex">
      <AppSidebar />
      <div
       className={cn(
        "app-main-column flex flex-1 flex-col",
        isAssistant && "app-main-column-assistant",
       )}
      >
       <AutoHideTopbar className="app-topbar mobile-header sticky top-0 z-40 shrink-0 border-b border-border/60 bg-background pb-[clamp(0.875rem,3vw,1.25rem)] md:z-40 md:border-b-0 md:pb-[clamp(1.25rem,3vh,1.5rem)]">
        <div className="mx-auto flex min-h-[3rem] w-full max-w-[1480px] items-center justify-between gap-3 md:min-h-[4.5rem]">
         <div className="flex min-w-0 flex-1 items-center gap-3">
          <ProfileMenu variant="mobile" className="md:hidden shrink-0" />
          <div className="min-w-0 md:hidden">
           <MobilePageTitle />
          </div>
          <div className="hidden min-w-0 flex-1 md:block">
           <DesktopSectionTitle />
          </div>
         </div>
         <div className="flex shrink-0 items-center gap-2">
          <LazyNotificationCenter />
          <ProfileMenu className="hidden md:inline-flex" />
         </div>
        </div>
       </AutoHideTopbar>
       <main
        className={cn(
         "app-content flex-1",
         isAssistant && "app-content-assistant",
        )}
       >
        <AnimatedPage>{children}</AnimatedPage>
       </main>
       <BottomNav />
      </div>
     </div>
     <AppCommandPalette />
    </div>
   </SectionHeaderProvider>
  </SidebarStateProvider>
 )
}