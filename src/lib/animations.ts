import type { Transition, Variants } from "motion/react"

export const defaultTransition: Transition = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1],
}

export const subtleTransition: Transition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1],
}

export const sidebarEntranceTransition: Transition = {
  duration: 0.35,
  ease: "easeOut",
}

export const pageTransition: Transition = {
  duration: 0.18,
  ease: "easeOut",
}

export const sidebarItemTransition: Transition = {
  duration: 0.16,
  ease: "easeOut",
}

export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  show: {
    opacity: 1,
    y: 0,
  },
}

export const fadeInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -24,
  },
  show: {
    opacity: 1,
    x: 0,
  },
}

export const fadeInRight: Variants = {
  hidden: {
    opacity: 0,
    x: 24,
  },
  show: {
    opacity: 1,
    x: 0,
  },
}

export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
}

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
}

export const pageFadeSlide: Variants = {
  initial: {
    opacity: 0,
    x: 15,
  },
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: -15,
  },
}
