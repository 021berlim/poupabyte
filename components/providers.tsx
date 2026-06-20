import type { ReactNode } from "react"
import { LazyToaster } from "@/components/lazy-toaster"
import { MotionProvider } from "@/components/motion/motion-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { StoreProvider } from "@/lib/store"

export function Providers({ children }: { children: ReactNode }) {
 return (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
   <MotionProvider>
    <StoreProvider>
     {children}
     <LazyToaster />
    </StoreProvider>
   </MotionProvider>
  </ThemeProvider>
 )
}
