"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { SwipeableRow } from "@/components/app/swipeable-row"
import { TransactionRow } from "@/components/app/transaction-row"
import { Button } from "@/components/ui/button"
import type { Transaction } from "@/lib/types"
import { useIsMobile } from "@/hooks/use-mobile"
import { useLongPress } from "@/hooks/use-long-press"
import { useRipple } from "@/hooks/use-ripple"
import { Pencil, Trash2 } from "lucide-react"

const TransactionActions = dynamic(
 () => import("@/components/app/transaction-actions").then((mod) => mod.TransactionActions),
 { ssr: false },
)

export function TransactionItem({
 tx,
 actions = false,
 variant = "compact",
 balanceAfter,
}: {
 tx: Transaction
 actions?: boolean
 variant?: "compact" | "ledger" | "statement"
 balanceAfter?: number
}) {
 const [actionSheetOpen, setActionSheetOpen] = useState(false)
 const [editOpen, setEditOpen] = useState(false)
 const [deleteOpen, setDeleteOpen] = useState(false)
 const isMobile = useIsMobile()
 const longPress = useLongPress<HTMLDivElement>(() => {
  if (actions) setActionSheetOpen(true)
 })
 const createRipple = useRipple<HTMLDivElement>()

 const row = (
  <div
   className="app-ripple-surface"
   {...longPress}
   onPointerDown={(event) => {
    createRipple(event)
    longPress.onPointerDown(event)
   }}
  >
   <TransactionRow
    tx={tx}
    variant={variant}
    balanceAfter={balanceAfter}
    actionSlot={actions ? (
     <TransactionActions
      tx={tx}
      actionSheetOpen={actionSheetOpen}
      onActionSheetOpenChange={setActionSheetOpen}
      editOpen={editOpen}
      onEditOpenChange={setEditOpen}
      deleteOpen={deleteOpen}
      onDeleteOpenChange={setDeleteOpen}
     />
    ) : undefined}
   />
  </div>
 )

 if (!actions || !isMobile) return row

 return (
  <SwipeableRow
   enabled={actions}
   leftAction={
    <Button
     type="button"
     size="icon"
     className="pointer-events-auto size-10 rounded-xl"
     aria-label="Categorizar lançamento"
     onClick={() => setEditOpen(true)}
    >
     <Pencil className="size-4" />
    </Button>
   }
   rightAction={
    <Button
     type="button"
     size="icon"
     variant="destructive"
     className="pointer-events-auto size-10 rounded-xl"
     aria-label="Excluir lançamento"
     onClick={() => setDeleteOpen(true)}
    >
     <Trash2 className="size-4" />
    </Button>
   }
  >
   {row}
  </SwipeableRow>
 )
}
