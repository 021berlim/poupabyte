"use client"

import type { ReactNode } from "react"
import { LazyMotion, MotionConfig, domAnimation } from "motion/react"

export function MotionProvider({ children }: { children: ReactNode }) {
 return (
  <MotionConfig reducedMotion="user">
   <LazyMotion features={domAnimation} strict>
    {children}
   </LazyMotion>
  </MotionConfig>
 )
}
