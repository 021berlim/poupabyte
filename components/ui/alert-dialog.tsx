'use client'

import * as React from 'react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'

import { cn } from '@/lib/utils'
import { MobileModalDragHandle } from '@/components/ui/mobile-modal-expand'
import { buttonVariants } from '@/components/ui/button'
import {
 captureModalScrollPosition,
 restoreModalScrollPosition,
 useTrackModalScrollPosition,
} from '@/components/ui/preserve-modal-scroll'

function AlertDialog({
 onOpenChange,
 ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
 const handleOpenChange = React.useCallback(
  (open: boolean) => {
   onOpenChange?.(open)
  },
  [onOpenChange],
 )

 return (
  <AlertDialogPrimitive.Root
   data-slot="alert-dialog"
   {...props}
   onOpenChange={handleOpenChange}
  />
 )
}

function AlertDialogTrigger({
 onKeyDownCapture,
 onPointerDownCapture,
 ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
 function handlePointerDownCapture(
  event: React.PointerEvent<HTMLButtonElement>,
 ) {
  captureModalScrollPosition()
  onPointerDownCapture?.(event)
 }

 function handleKeyDownCapture(event: React.KeyboardEvent<HTMLButtonElement>) {
  captureModalScrollPosition()
  onKeyDownCapture?.(event)
 }

 return (
  <AlertDialogPrimitive.Trigger
   data-slot="alert-dialog-trigger"
   {...props}
   onPointerDownCapture={handlePointerDownCapture}
   onKeyDownCapture={handleKeyDownCapture}
  />
 )
}

function AlertDialogPortal({
 ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
 return (
  <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
 )
}

function AlertDialogOverlay({
 className,
 ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
 return (
  <AlertDialogPrimitive.Overlay
   data-slot="alert-dialog-overlay"
   className={cn(
    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
    className,
   )}
   {...props}
  />
 )
}

function AlertDialogContent({
 className,
 children,
 onOpenAutoFocus,
 ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
 useTrackModalScrollPosition()
 const contentRef = React.useRef<HTMLDivElement>(null)

 function handleOpenAutoFocus(event: Event) {
  onOpenAutoFocus?.(event)
  if (!event.defaultPrevented) {
   event.preventDefault()
  }

  restoreModalScrollPosition()
  window.requestAnimationFrame(() => {
   const focusTarget = contentRef.current?.querySelector<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
   )

   focusTarget?.focus({ preventScroll: true })
   restoreModalScrollPosition()
  })
 }

 return (
  <AlertDialogPortal>
   <AlertDialogOverlay />
   <AlertDialogPrimitive.Content
    data-slot="alert-dialog-content"
    className={cn(
     'app-responsive-dialog-content app-responsive-alert-dialog-content app-desktop-panel app-overlay-surface bg-popover text-popover-foreground border-border data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom fixed inset-x-0 bottom-0 z-50 flex w-full min-h-0 flex-col gap-0 overflow-hidden rounded-t-[1rem] border-t p-0 duration-300 md:data-[state=closed]:slide-out-to-right md:data-[state=open]:slide-in-from-right',
     className,
    )}
    {...props}
    ref={contentRef}
    onOpenAutoFocus={handleOpenAutoFocus}
   >
    <MobileModalDragHandle contentRef={contentRef} />
    {children}
   </AlertDialogPrimitive.Content>
  </AlertDialogPortal>
 )
}

function AlertDialogHeader({
 className,
 ...props
}: React.ComponentProps<'div'>) {
 return (
  <div
   data-slot="alert-dialog-header"
   className={cn(
    'flex flex-col gap-1.5 border-b px-6 py-5 pr-12 text-left',
    className,
   )}
   {...props}
  />
 )
}

function AlertDialogFooter({
 className,
 ...props
}: React.ComponentProps<'div'>) {
 return (
  <div
   data-slot="alert-dialog-footer"
   className={cn(
    'mt-auto flex flex-row gap-2 border-t px-6 py-4 [&>*]:h-10 [&>*]:flex-1',
    className,
   )}
   {...props}
  />
 )
}

function AlertDialogTitle({
 className,
 ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
 return (
  <AlertDialogPrimitive.Title
   data-slot="alert-dialog-title"
   className={cn('text-[15px] leading-5 font-medium', className)}
   {...props}
  />
 )
}

function AlertDialogDescription({
 className,
 ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
 return (
  <AlertDialogPrimitive.Description
   data-slot="alert-dialog-description"
   className={cn('text-muted-foreground text-xs leading-4', className)}
   {...props}
  />
 )
}

function AlertDialogAction({
 className,
 ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
 return (
  <AlertDialogPrimitive.Action
   className={cn(buttonVariants(), className)}
   {...props}
  />
 )
}

function AlertDialogCancel({
 className,
 ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
 return (
  <AlertDialogPrimitive.Cancel
   className={cn(buttonVariants({ variant: 'outline' }), className)}
   {...props}
  />
 )
}

export {
 AlertDialog,
 AlertDialogPortal,
 AlertDialogOverlay,
 AlertDialogTrigger,
 AlertDialogContent,
 AlertDialogHeader,
 AlertDialogFooter,
 AlertDialogTitle,
 AlertDialogDescription,
 AlertDialogAction,
 AlertDialogCancel,
}
