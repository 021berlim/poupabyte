"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { findSimilarPending } from "@/lib/transaction-utils"
import { useStore } from "@/lib/store"
import type { Transaction } from "@/lib/types"
import { CheckCheck } from "lucide-react"

export function ConfirmSimilarButton({ tx }: { tx: Transaction }) {
 const { transactions, confirmSimilarTransactions } = useStore()
 const similarCount = useMemo(() => findSimilarPending(transactions, tx).length, [transactions, tx])

 if (similarCount < 2 || tx.category === "nao-categorizado") return null

 return (
  <Button
   type="button"
   variant="outline"
   size="sm"
   className="h-8 gap-1.5 rounded-xl text-xs"
   onClick={() => confirmSimilarTransactions(tx.id)}
  >
   <CheckCheck className="h-3.5 w-3.5" />
   Confirmar {similarCount} similares
  </Button>
 )
}