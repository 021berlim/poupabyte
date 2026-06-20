"use client"

import { useEffect, useId, useRef, useState } from "react"
import type { HTMLMotionProps } from "motion/react"
import { useInView, useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import { defaultTransition, fadeInRight } from "@/src/lib/animations"
import { cn } from "@/lib/utils"

type AnimatedCardProps = HTMLMotionProps<"div"> & {
 animationKey?: string
 delay?: number
 respectReducedMotion?: boolean
 revealOnView?: boolean
 viewportAmount?: number
}

const animationDedupeMs = 1200
const runningCardAnimations = new Map<string, number>()

function wasRecentlyAnimated(key: string) {
 const startedAt = runningCardAnimations.get(key)
 return typeof startedAt === "number" && Date.now() - startedAt < animationDedupeMs
}

function rememberAnimation(key: string) {
 const startedAt = Date.now()
 runningCardAnimations.set(key, startedAt)

 window.setTimeout(() => {
  if (runningCardAnimations.get(key) === startedAt) {
   runningCardAnimations.delete(key)
  }
 }, animationDedupeMs)
}

const cardClassName =
 "text-card-foreground flex flex-col gap-[clamp(1rem,2.8vw,1.25rem)] border-y border-border/70 py-[clamp(1rem,3vw,1.25rem)]"

export function AnimatedCard({
 animationKey,
 className,
 delay = 0,
 respectReducedMotion = false,
 revealOnView = true,
 viewportAmount = 0.22,
 variants = fadeInRight,
 transition,
 ...props
}: AnimatedCardProps) {
 const generatedAnimationKey = useId()
 const dedupeKey = animationKey ?? generatedAnimationKey
 const cardRef = useRef<HTMLDivElement>(null)
 const isInView = useInView(cardRef, { once: true, amount: viewportAmount })
 const prefersReducedMotion = useReducedMotion()
 const shouldReduceMotion = respectReducedMotion && prefersReducedMotion
 const [animationState, setAnimationState] = useState<"hidden" | "show">(() =>
  wasRecentlyAnimated(dedupeKey) ? "show" : "hidden",
 )
 const hasAnimatedRef = useRef(animationState === "show")

 useEffect(() => {
  if (shouldReduceMotion) {
   hasAnimatedRef.current = true
   return
  }

  if (hasAnimatedRef.current || (revealOnView && !isInView)) {
   return
  }

  let firstFrame = 0
  let secondFrame = 0

  firstFrame = requestAnimationFrame(() => {
   secondFrame = requestAnimationFrame(() => {
    if (hasAnimatedRef.current || wasRecentlyAnimated(dedupeKey)) {
     hasAnimatedRef.current = true
     setAnimationState("show")
     return
    }

    hasAnimatedRef.current = true
    rememberAnimation(dedupeKey)
    setAnimationState("show")
   })
  })

  return () => {
   cancelAnimationFrame(firstFrame)
   cancelAnimationFrame(secondFrame)
  }
 }, [dedupeKey, isInView, revealOnView, shouldReduceMotion])

 return (
  <m.div
   data-slot="card"
   ref={cardRef}
   initial={shouldReduceMotion || animationState === "show" ? false : "hidden"}
   animate={shouldReduceMotion ? "show" : animationState}
   variants={variants}
   transition={shouldReduceMotion ? { duration: 0 } : { ...defaultTransition, delay, ...transition }}
   className={cn(cardClassName, className)}
   {...props}
  />
 )
}
