'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { MobileModalDragHandle } from '@/components/ui/mobile-modal-expand'
import {
 captureModalScrollPosition,
 restoreModalScrollPosition,
 useTrackModalScrollPosition,
} from '@/components/ui/preserve-modal-scroll'

function Dialog({
 onOpenChange,
 ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
 const handleOpenChange = React.useCallback(
  (open: boolean) => {
   onOpenChange?.(open)
  },
  [onOpenChange],
 )

 return (
  <DialogPrimitive.Root
   data-slot="dialog"
   {...props}
   onOpenChange={handleOpenChange}
  />
 )
}

function DialogTrigger({
 onKeyDownCapture,
 onPointerDownCapture,
 ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
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
  <DialogPrimitive.Trigger
   data-slot="dialog-trigger"
   {...props}
   onPointerDownCapture={handlePointerDownCapture}
   onKeyDownCapture={handleKeyDownCapture}
  />
 )
}

function DialogPortal({
 ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
 return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
 ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
 return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
 className,
 ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
 return (
  <DialogPrimitive.Overlay
   data-slot="dialog-overlay"
   className={cn(
    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
    className,
   )}
   {...props}
  />
 )
}

function DialogContent({
 className,
 children,
 showCloseButton = true,
 onOpenAutoFocus,
 ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
 showCloseButton?: boolean
}) {
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
  <DialogPortal data-slot="dialog-portal">
   <DialogOverlay />
   <DialogPrimitive.Content
   data-slot="dialog-content"
   className={cn(
     'app-responsive-dialog-content app-desktop-panel app-overlay-surface bg-popover text-popover-foreground border-border data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom fixed inset-x-0 bottom-0 z-50 flex w-full min-h-0 flex-col gap-0 overflow-hidden rounded-t-[1rem] border-t p-0 duration-300 md:data-[state=closed]:slide-out-to-right md:data-[state=open]:slide-in-from-right',
     className,
    )}
    {...props}
    ref={contentRef}
   onOpenAutoFocus={handleOpenAutoFocus}
   >
    <MobileModalDragHandle contentRef={contentRef} />
    {children}
    {showCloseButton && (
     <DialogPrimitive.Close
      data-slot="dialog-close"
      className="text-muted-foreground hover:text-foreground ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-md transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
     >
      <XIcon />
      <span className="sr-only">Fechar</span>
     </DialogPrimitive.Close>
    )}
   </DialogPrimitive.Content>
  </DialogPortal>
 )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
 return (
  <div
   data-slot="dialog-header"
   className={cn('flex flex-col gap-1.5 border-b px-6 py-5 pr-12 text-left', className)}
   {...props}
  />
 )
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
 return (
  <div
   data-slot="dialog-footer"
   className={cn(
    'mt-auto flex shrink-0 flex-row gap-2 border-t px-6 py-4 [&>[data-slot=button]]:h-10 [&>[data-slot=button]]:flex-1',
    className,
   )}
   {...props}
  />
 )
}

function DialogTitle({
 className,
 ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
 return (
  <DialogPrimitive.Title
   data-slot="dialog-title"
   className={cn('text-[15px] leading-5 font-medium', className)}
   {...props}
  />
 )
}

function DialogDescription({
 className,
 ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
 return (
  <DialogPrimitive.Description
   data-slot="dialog-description"
   className={cn('text-muted-foreground text-xs leading-4', className)}
   {...props}
  />
 )
}

export {
 Dialog,
 DialogClose,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogOverlay,
 DialogPortal,
 DialogTitle,
 DialogTrigger,
}
