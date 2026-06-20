"use client"

import type { ReactNode } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export function ActionSheet({
 open,
 onOpenChange,
 title,
 description = "Escolha uma ação para este item.",
 children,
}: {
 open: boolean
 onOpenChange: (open: boolean) => void
 title: string
 description?: string
 children: ReactNode
}) {
 return (
  <Sheet open={open} onOpenChange={onOpenChange}>
   <SheetContent side="responsive" className="app-responsive-filter-sheet overflow-hidden md:hidden">
    <SheetHeader className="border-b px-6 py-5 pr-12 text-left">
     <SheetTitle className="truncate">{title}</SheetTitle>
     <SheetDescription>{description}</SheetDescription>
    </SheetHeader>
    <div className="app-responsive-modal-body grid gap-1 px-6 py-4">{children}</div>
   </SheetContent>
  </Sheet>
 )
}
