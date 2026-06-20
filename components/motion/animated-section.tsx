"use client"

import type { HTMLMotionProps } from "motion/react"
import { useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import { defaultTransition, fadeInUp } from "@/src/lib/animations"

type AnimatedSectionBaseProps = {
 delay?: number
 respectReducedMotion?: boolean
 revealOnView?: boolean
 viewportAmount?: number
}

type AnimatedSectionProps =
 | (HTMLMotionProps<"section"> &
   AnimatedSectionBaseProps & {
    as?: "section"
   })
 | (HTMLMotionProps<"div"> &
   AnimatedSectionBaseProps & {
    as: "div"
   })

function getTransition(
 shouldReduceMotion: boolean | null,
 delay: number,
 transition: AnimatedSectionProps["transition"],
) {
 return shouldReduceMotion ? { duration: 0 } : { ...defaultTransition, delay, ...transition }
}

function getRevealProps(
 shouldReduceMotion: boolean | null,
 revealOnView: boolean,
 viewportAmount: number,
) {
 if (shouldReduceMotion) {
  return { initial: false, animate: "show" as const }
 }

 if (revealOnView) {
  return {
   initial: "hidden" as const,
   whileInView: "show" as const,
   viewport: { once: true, amount: viewportAmount },
  }
 }

 return { initial: "hidden" as const, animate: "show" as const }
}

export function AnimatedSection(props: AnimatedSectionProps) {
 const prefersReducedMotion = useReducedMotion()

 if (props.as === "div") {
  const {
   as: _as,
   delay = 0,
   respectReducedMotion = false,
   revealOnView = true,
   viewportAmount = 0.22,
   variants = fadeInUp,
   transition,
   ...rest
  } = props
  const shouldReduceMotion = respectReducedMotion && prefersReducedMotion

  return (
   <m.div
    {...getRevealProps(shouldReduceMotion, revealOnView, viewportAmount)}
    variants={variants}
    transition={getTransition(shouldReduceMotion, delay, transition)}
    {...rest}
   />
  )
 }

 const {
  as: _as,
  delay = 0,
  respectReducedMotion = false,
  revealOnView = true,
  viewportAmount = 0.22,
  variants = fadeInUp,
  transition,
  ...rest
 } = props
 const shouldReduceMotion = respectReducedMotion && prefersReducedMotion

 return (
  <m.section
   {...getRevealProps(shouldReduceMotion, revealOnView, viewportAmount)}
   variants={variants}
   transition={getTransition(shouldReduceMotion, delay, transition)}
   {...rest}
  />
 )
}
