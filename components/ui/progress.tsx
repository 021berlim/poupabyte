'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'

import { cn } from '@/lib/utils'

export type ProgressStatusTone = 'completed' | 'healthy' | 'at-risk' | 'exceeded'

export const PROGRESS_INDICATOR_TONE: Record<ProgressStatusTone, string> = {
  completed: '[&_[data-slot=progress-indicator]]:bg-success',
  healthy: '[&_[data-slot=progress-indicator]]:bg-primary/45',
  'at-risk': '[&_[data-slot=progress-indicator]]:bg-primary',
  exceeded: '[&_[data-slot=progress-indicator]]:bg-destructive',
}

export function goalProgressTone(progress: { completed: boolean; atRisk: boolean }): string {
  if (progress.completed) return PROGRESS_INDICATOR_TONE.completed
  if (progress.atRisk) return PROGRESS_INDICATOR_TONE['at-risk']
  return PROGRESS_INDICATOR_TONE.healthy
}

export function limitProgressTone(percent: number): string {
  if (percent > 100) return PROGRESS_INDICATOR_TONE.exceeded
  if (percent >= 71) return PROGRESS_INDICATOR_TONE['at-risk']
  return PROGRESS_INDICATOR_TONE.healthy
}

function Progress({
 className,
 value,
 ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
 return (
  <ProgressPrimitive.Root
   data-slot="progress"
   className={cn(
    'bg-primary/20 relative h-2 w-full overflow-hidden rounded-[3px]',
    className,
   )}
   {...props}
  >
   <ProgressPrimitive.Indicator
    data-slot="progress-indicator"
    className="bg-primary h-full w-full flex-1 transition-transform duration-300 ease-out"
    style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
   />
  </ProgressPrimitive.Root>
 )
}

export { Progress }
