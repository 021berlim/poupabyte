"use client"

import { BrandLogo } from "@/components/brand-logo"
import { NotificationCenter } from "@/components/app/notification-center"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { TransactionDialog } from "@/components/app/transaction-dialog"
import { Button } from "@/components/ui/button"
import { Plus, Sparkles } from "lucide-react"

export function TopBar() {
 return (
  <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 px-4 sm:px-6 lg:px-8 xl:px-10">
   <div className="mx-auto flex h-16 w-full max-w-[1480px] items-center justify-between gap-4">
    <div className="flex min-w-0 items-center gap-2 md:hidden">
     <BrandLogo size="sm" />
    </div>

    <div className="hidden min-w-0 md:block">
     <div className="flex items-center gap-2 text-xs font-semibold text-primary">
      <Sparkles className="h-3.5 w-3.5" />
      Workspace financeiro
     </div>
     <p className="mt-1 text-base font-extrabold text-foreground">Painel PoupaByte</p>
    </div>

    <div className="flex items-center gap-2">
     <TransactionDialog
      trigger={
       <Button size="sm" className="h-9 rounded-2xl px-3 sm:px-4">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Nova transacao</span>
       </Button>
      }
     />
     <NotificationCenter />
     <ThemeToggle />
    </div>
   </div>
  </header>
 )
}
