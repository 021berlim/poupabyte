"use client"

import type { HTMLMotionProps } from "motion/react"
import { AnimatedSection } from "@/components/motion/animated-section"
import { cn } from "@/lib/utils"

export type FeatureCardTone = "balance" | "income" | "expense" | "planning" | "investment" | "report" | "neutral" | "surface"

const grayCardClassName = "border-border/80 bg-transparent text-foreground"

const toneClassName: Record<FeatureCardTone, string> = {
 balance: grayCardClassName,
 income: grayCardClassName,
 expense: grayCardClassName,
 planning: grayCardClassName,
 investment: grayCardClassName,
 report: grayCardClassName,
 neutral: grayCardClassName,
 surface: grayCardClassName,
}

type FeatureCardProps = HTMLMotionProps<"div"> & {
 tone?: FeatureCardTone
 delay?: number
}

export function FeatureCard({
 tone = "neutral",
 className,
 delay = 0,
 ...props
}: FeatureCardProps) {
 return (
  <AnimatedSection
   as="div"
   delay={delay}
   className={cn(
    "relative flex min-w-0 flex-col overflow-hidden border-y p-[clamp(1rem,3vw,1.25rem)]",
    toneClassName[tone],
    className,
   )}
   {...props}
  />
 )
}
