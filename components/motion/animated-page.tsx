"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { ROUTES } from "@/lib/routes"
import { AnimatePresence, useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import { pageFadeSlide, pageTransition } from "@/src/lib/animations"
import { cn } from "@/lib/utils"

export function AnimatedPage({
 children,
 className,
 respectReducedMotion = true,
}: {
 children: ReactNode
 className?: string
 respectReducedMotion?: boolean
}) {
 const pathname = usePathname()
 const prefersReducedMotion = useReducedMotion()
 const shouldReduceMotion = respectReducedMotion && prefersReducedMotion

 return (
  <AnimatePresence mode="sync" initial={false}>
   <m.div
    key={pathname}
    initial={shouldReduceMotion ? false : "initial"}
    animate="animate"
    exit={shouldReduceMotion ? undefined : "exit"}
    variants={pageFadeSlide}
    transition={shouldReduceMotion ? { duration: 0 } : pageTransition}
    className={cn(
     "min-w-0",
     pathname === ROUTES.assistant && "flex min-h-0 flex-1 flex-col",
     className,
    )}
   >
    {children}
   </m.div>
  </AnimatePresence>
 )
}
