"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
 applySidebarState,
 getStoredSidebarState,
 persistSidebarState,
 type SidebarState,
} from "@/lib/sidebar-storage"

type SidebarContextValue = {
 state: SidebarState
 isCollapsed: boolean
 isMobile: boolean
 mobileOpen: boolean
 setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>
 setSidebarState: (state: SidebarState) => void
 toggleSidebar: () => void
 toggleMobileSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function isTypingTarget(target: EventTarget | null) {
 if (!(target instanceof HTMLElement)) {
  return false
 }

 return Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
}

export function SidebarStateProvider({ children }: { children: React.ReactNode }) {
 const isMobile = useIsMobile()
 const [state, setState] = React.useState<SidebarState>(() => getStoredSidebarState())
 const [mobileOpen, setMobileOpen] = React.useState(false)

 const setSidebarState = React.useCallback((nextState: SidebarState) => {
  setState(nextState)
  persistSidebarState(nextState)
 }, [])

 const toggleDesktopSidebar = React.useCallback(() => {
  setSidebarState(state === "collapsed" ? "expanded" : "collapsed")
 }, [setSidebarState, state])

 const toggleMobileSidebar = React.useCallback(() => {
  setMobileOpen((open) => !open)
 }, [])

 const toggleSidebar = React.useCallback(() => {
  if (isMobile) {
   return
  }

  toggleDesktopSidebar()
 }, [isMobile, toggleDesktopSidebar])

 React.useEffect(() => {
  applySidebarState(state)
 }, [state])

 React.useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
   if (!event.ctrlKey || event.key.toLowerCase() !== "b" || isTypingTarget(event.target)) {
    return
   }

   event.preventDefault()
   toggleSidebar()
  }

  window.addEventListener("keydown", handleKeyDown)
  return () => window.removeEventListener("keydown", handleKeyDown)
 }, [toggleSidebar])

 const value = React.useMemo<SidebarContextValue>(
  () => ({
   state,
   isCollapsed: state === "collapsed",
   isMobile,
   mobileOpen,
   setMobileOpen,
   setSidebarState,
   toggleSidebar,
   toggleMobileSidebar,
  }),
  [
   state,
   isMobile,
   mobileOpen,
   setSidebarState,
   toggleSidebar,
   toggleMobileSidebar,
  ],
 )

 return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function useSidebarState() {
 const context = React.useContext(SidebarContext)

 if (!context) {
  throw new Error("useSidebarState must be used within SidebarStateProvider.")
 }

 return context
}
