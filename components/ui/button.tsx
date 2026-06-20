'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { useRipple } from '@/hooks/use-ripple'

const buttonVariants = cva(
 "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/35 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
 {
  variants: {
   variant: {
    default:
     'border border-primary/35 bg-primary text-primary-foreground hover:border-primary/45 hover:bg-primary/90',
    destructive:
     'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
    outline:
     'border bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
    secondary:
     'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost:
     'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
    link: 'text-primary underline-offset-4 hover:underline',
   },
   size: {
    default: 'h-10 px-4 py-2 has-[>svg]:px-3',
    sm: 'h-9 rounded-2xl gap-1.5 px-3 has-[>svg]:px-2.5',
    lg: 'h-11 rounded-2xl px-6 has-[>svg]:px-4',
    icon: 'size-10',
    'icon-sm': 'size-9',
    'icon-lg': 'size-11',
   },
  },
  defaultVariants: {
   variant: 'default',
   size: 'default',
  },
 },
)

function Button({
 className,
 variant,
 size,
 asChild = false,
 onPointerDown,
 ...props
}: React.ComponentProps<'button'> &
 VariantProps<typeof buttonVariants> & {
  asChild?: boolean
 }) {
 const Comp = asChild ? Slot : 'button'
 const createRipple = useRipple<HTMLElement>()

 return (
  <Comp
   data-slot="button"
   className={cn("app-ripple-surface", buttonVariants({ variant, size, className }))}
   onPointerDown={(event: React.PointerEvent<HTMLElement>) => {
    createRipple(event)
    onPointerDown?.(event as React.PointerEvent<HTMLButtonElement>)
   }}
   {...props}
  />
 )
}

export { Button, buttonVariants }
