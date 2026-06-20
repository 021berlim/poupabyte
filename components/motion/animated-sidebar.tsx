"use client"

import type { HTMLMotionProps } from "motion/react"
import { useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import { fadeInLeft, sidebarEntranceTransition } from "@/src/lib/animations"

type AnimatedSidebarBaseProps = {
 delay?: number
 respectReducedMotion?: boolean
}

type AnimatedSidebarProps =
 | (HTMLMotionProps<"aside"> &
   AnimatedSidebarBaseProps & {
    as?: "aside"
   })
 | (HTMLMotionProps<"div"> &
   AnimatedSidebarBaseProps & {
    as: "div"
   })

function getTransition(
 shouldReduceMotion: boolean | null,
 delay: number,
 transition: AnimatedSidebarProps["transition"],
) {
 return shouldReduceMotion ? { duration: 0 } : { ...sidebarEntranceTransition, delay, ...transition }
}

export function AnimatedSidebar(props: AnimatedSidebarProps) {
 const prefersReducedMotion = useReducedMotion()

 if (props.as === "div") {
  const {
   as: _as,
   delay = 0,
   respectReducedMotion = false,
   variants = fadeInLeft,
   transition,
   ...rest
  } = props
  const shouldReduceMotion = respectReducedMotion && prefersReducedMotion

  return (
   <m.div
    initial={shouldReduceMotion ? false : "hidden"}
    animate="show"
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
  variants = fadeInLeft,
  transition,
  ...rest
 } = props
 const shouldReduceMotion = respectReducedMotion && prefersReducedMotion

 return (
  <m.aside
   initial={shouldReduceMotion ? false : "hidden"}
   animate="show"
   variants={variants}
   transition={getTransition(shouldReduceMotion, delay, transition)}
   {...rest}
  />
 )
}
