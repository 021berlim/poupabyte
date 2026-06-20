"use client"

import {
 createContext,
 useCallback,
 useContext,
 useMemo,
 useState,
 type ReactNode,
} from "react"

type SectionHeaderState = {
 ownerId?: string
 path?: string
 title?: string
 subtitle?: string
 action?: ReactNode
}

type SectionHeaderContextValue = {
 header: SectionHeaderState
 setHeader: (header: SectionHeaderState | ((prev: SectionHeaderState) => SectionHeaderState)) => void
}

const SectionHeaderContext = createContext<SectionHeaderContextValue | null>(null)

export function SectionHeaderProvider({ children }: { children: ReactNode }) {
 const [header, setHeaderState] = useState<SectionHeaderState>({})
 const setHeader = useCallback(
  (update: SectionHeaderState | ((prev: SectionHeaderState) => SectionHeaderState)) => {
   setHeaderState((prev) => (typeof update === "function" ? update(prev) : update))
  },
  [],
 )
 const value = useMemo(() => ({ header, setHeader }), [header, setHeader])

 return (
  <SectionHeaderContext.Provider value={value}>
   {children}
  </SectionHeaderContext.Provider>
 )
}

export function useSectionHeader() {
 const context = useContext(SectionHeaderContext)
 if (!context) {
  throw new Error("useSectionHeader must be used inside SectionHeaderProvider")
 }

 return context
}
