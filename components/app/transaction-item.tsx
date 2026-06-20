"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { TransactionRow } from "@/components/app/transaction-row"
import type { Transaction } from "@/lib/types"
import { useLongPress } from "@/hooks/use-long-press"
import { useRipple } from "@/hooks/use-ripple"

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
 const longPress = useLongPress<HTMLDivElement>(() => {
  if (actions) setActionSheetOpen(true)
 })
 const createRipple = useRipple<HTMLDivElement>()

 return (
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
     <TransactionActions tx={tx} actionSheetOpen={actionSheetOpen} onActionSheetOpenChange={setActionSheetOpen} />
    ) : undefined}
   />
  </div>
 )
}
