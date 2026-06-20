"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSidebarState } from "@/components/app/sidebar-context"

type SidebarToggleProps = Omit<React.ComponentProps<typeof Button>, "size" | "variant"> & {
 mode?: "desktop" | "mobile"
}

export function SidebarToggle({
 mode = "desktop",
 className,
 onClick,
 ...props
}: SidebarToggleProps) {
 const { isCollapsed, mobileOpen, toggleDesktopSidebar, toggleMobileSidebar } =
  useSidebarToggleState()
 const isOpen = mode === "mobile" ? mobileOpen : !isCollapsed
 const label = isOpen ? "Recolher menu" : "Expandir menu"

 return (
  <Button
   type="button"
   variant="ghost"
   size="icon"
   aria-label={label}
   title={label}
   suppressHydrationWarning
   className={cn(
    "h-9 w-9 rounded-2xl border border-border/80 bg-white text-muted-foreground transition-colors duration-300 hover:bg-accent hover:text-primary dark:border-white/10 dark:bg-card/90",
    className,
   )}
   onClick={(event) => {
    onClick?.(event)
    if (event.defaultPrevented) {
     return
    }

    if (mode === "mobile") {
     toggleMobileSidebar()
     return
    }

    toggleDesktopSidebar()
   }}
   {...props}
  >
   {mode === "mobile" ? (
    mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />
   ) : <span className="relative h-4 w-4" aria-hidden="true">
    <ChevronLeft
     className={cn(
      "absolute inset-0 h-4 w-4 transition-[opacity,transform] duration-300 ease-out",
      isOpen ? "rotate-0 opacity-100 scale-100" : "-rotate-180 opacity-0 scale-75",
     )}
    />
    <ChevronRight
     className={cn(
      "absolute inset-0 h-4 w-4 transition-[opacity,transform] duration-300 ease-out",
      isOpen ? "rotate-180 opacity-0 scale-75" : "rotate-0 opacity-100 scale-100",
     )}
    />
   </span>}
  </Button>
 )
}

function useSidebarToggleState() {
 const { isCollapsed, mobileOpen, setSidebarState, toggleMobileSidebar } = useSidebarState()

 const toggleDesktopSidebar = React.useCallback(() => {
  setSidebarState(isCollapsed ? "expanded" : "collapsed")
 }, [isCollapsed, setSidebarState])

 return {
  isCollapsed,
  mobileOpen,
  toggleDesktopSidebar,
  toggleMobileSidebar,
 }
}
