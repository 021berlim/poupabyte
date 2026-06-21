"use client"

import { useState } from "react"
import type { Transaction } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ConfirmSimilarButton } from "@/components/app/confirm-similar-button"
import { TransactionDialog } from "@/components/app/transaction-dialog"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import { useStore } from "@/lib/store"
import { ActionSheet } from "@/components/app/action-sheet"

export function TransactionActions({
 tx,
 actionSheetOpen = false,
 onActionSheetOpenChange = () => {},
}: {
 tx: Transaction
 actionSheetOpen?: boolean
 onActionSheetOpenChange?: (open: boolean) => void
}) {
 const { deleteTransaction } = useStore()
 const [editOpen, setEditOpen] = useState(false)
 const [delOpen, setDelOpen] = useState(false)

 return (
  <>
   <div className="flex items-center gap-1">
    <ConfirmSimilarButton tx={tx} />
   <DropdownMenu>
    <DropdownMenuTrigger asChild>
     <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-xl text-muted-foreground hover:bg-muted/70 hover:text-foreground" aria-label="Ações">
      <MoreVertical className="h-4 w-4" />
     </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
     <DropdownMenuItem onSelect={() => setTimeout(() => setEditOpen(true), 0)}>
      <Pencil className="h-4 w-4" />
      Editar
     </DropdownMenuItem>
     <DropdownMenuItem variant="destructive" onSelect={() => setTimeout(() => setDelOpen(true), 0)}>
      <Trash2 className="h-4 w-4" />
      Excluir
     </DropdownMenuItem>
    </DropdownMenuContent>
   </DropdownMenu>
   </div>

   <ActionSheet open={actionSheetOpen} onOpenChange={onActionSheetOpenChange} title={tx.description}>
    <Button
     variant="ghost"
     className="h-12 w-full justify-start rounded-xl px-3"
     onClick={() => {
      onActionSheetOpenChange(false)
      setTimeout(() => setEditOpen(true), 0)
     }}
    >
     <Pencil className="h-4 w-4" />
     Editar
    </Button>
    <Button
     variant="ghost"
     className="h-12 w-full justify-start rounded-xl px-3 text-destructive hover:text-destructive"
     onClick={() => {
      onActionSheetOpenChange(false)
      setTimeout(() => setDelOpen(true), 0)
     }}
    >
     <Trash2 className="h-4 w-4" />
     Excluir
    </Button>
   </ActionSheet>

   {editOpen ? <TransactionDialog transaction={tx} open={editOpen} onOpenChange={setEditOpen} /> : null}

   <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
    <AlertDialogContent>
     <AlertDialogHeader>
      <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
      <AlertDialogDescription>
       A transação &quot;{tx.description}&quot; será removida permanentemente.
      </AlertDialogDescription>
     </AlertDialogHeader>
     <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction
       className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      onClick={() => {
       deleteTransaction(tx.id)
      }}
      >
       Excluir
      </AlertDialogAction>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>
  </>
 )
}
