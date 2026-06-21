"use client"

import type { ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app/app-sidebar"
import { AutoHideTopbar } from "@/components/app/auto-hide-topbar"
import { BottomNav } from "@/components/app/bottom-nav"
import { DesktopSectionTitle } from "@/components/app/desktop-section-title"
import { LazyNotificationCenter } from "@/components/app/lazy-notification-center"
import { MobileSidebarSheet } from "@/components/app/mobile-sidebar-sheet"
import { ProfileMenu } from "@/components/app/profile-menu"
import { SectionHeaderProvider } from "@/components/app/section-header-context"
import { SidebarToggle } from "@/components/app/sidebar-toggle"
import { SidebarStateProvider } from "@/components/app/sidebar-context"
import { AnimatedPage } from "@/components/motion/animated-page"
import { ROUTES } from "@/lib/routes"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

export function AppShell({ children }: { children: ReactNode }) {
 const pathname = usePathname()
 const router = useRouter()
 const { logout } = useStore()
 const isAssistant = pathname === ROUTES.assistant

 function handleLogout() {
  logout()
  void import("sonner").then(({ toast }) => toast.success("Sessão encerrada."))
  router.replace("/login")
 }

 return (
  <SidebarStateProvider>
   <SectionHeaderProvider>
    <div className="app-page-root">
     <div className="app-shell-grid flex">
      <AppSidebar />
      <MobileSidebarSheet handleLogout={handleLogout} />
      <div
       className={cn(
        "app-main-column flex flex-1 flex-col",
        isAssistant && "app-main-column-assistant",
       )}
      >
       <AutoHideTopbar className="app-topbar mobile-header sticky top-0 z-40 shrink-0 border-b border-border/60 bg-background pb-[clamp(0.875rem,3vw,1.25rem)] md:z-40 md:border-b-0 md:pb-[clamp(1.25rem,3vh,1.5rem)]">
        <div className="mx-auto flex min-h-[3rem] w-full max-w-[1480px] items-center justify-between gap-3 md:min-h-[4.5rem]">
         <div className="flex min-w-0 items-center gap-2 md:hidden">
          <SidebarToggle mode="mobile" className="shrink-0" />
         </div>
         <div className="hidden min-w-0 flex-1 md:block">
          <DesktopSectionTitle />
         </div>
         <ProfileMenu variant="mobile" className="md:hidden" />
         <div className="ml-auto flex items-center gap-2">
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
    </div>
   </SectionHeaderProvider>
  </SidebarStateProvider>
 )
}