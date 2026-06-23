"use client"

import { useState } from "react"
import { ListRow } from "@/components/app/list-row"
import { investmentPerformance } from "@/lib/selectors"
import { formatCurrency } from "@/lib/format"
import type { Investment } from "@/lib/types"
import { INVESTMENT_TYPE_LABELS } from "@/lib/selectors"
import { cn } from "@/lib/utils"
import { Landmark } from "lucide-react"

type SortKey = "name" | "type" | "institution" | "invested" | "current" | "return"

export function InvestmentTable({ investments }: { investments: Investment[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [asc, setAsc] = useState(true)

  function sortValue(investment: Investment, key: SortKey) {
    const perf = investmentPerformance(investment)
    const map: Record<SortKey, string | number> = {
      name: investment.name,
      type: INVESTMENT_TYPE_LABELS[investment.type],
      institution: investment.institution,
      invested: investment.investedAmount,
      current: investment.currentValue,
      return: perf.returnPercent,
    }
    return map[key]
  }

  const sorted = [...investments].sort((a, b) => {
    const left = sortValue(a, sortKey)
    const right = sortValue(b, sortKey)
    if (typeof left === "number" && typeof right === "number") {
      return asc ? left - right : right - left
    }
    return asc
      ? String(left).localeCompare(String(right), "pt-BR")
      : String(right).localeCompare(String(left), "pt-BR")
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setAsc((value) => !value)
    else {
      setSortKey(key)
      setAsc(true)
    }
  }

  return (
    <>
      <div className="hidden overflow-x-auto border-t md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
              {(
                [
                  ["name", "Nome"],
                  ["type", "Tipo"],
                  ["institution", "Instituição"],
                  ["invested", "Aplicado"],
                  ["current", "Atual"],
                  ["return", "Rentabilidade"],
                ] as const
              ).map(([key, label]) => (
                <th key={key} className="px-3 py-3 font-semibold">
                  <button type="button" className="hover:text-foreground" onClick={() => toggleSort(key)}>
                    {label}
                    {sortKey === key ? (asc ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((investment) => {
              const performance = investmentPerformance(investment)
              const positive = performance.returnAmount >= 0
              return (
                <tr key={investment.id} className="app-row-hover">
                  <td className="px-3 py-3 font-semibold">{investment.name}</td>
                  <td className="px-3 py-3 text-muted-foreground">{INVESTMENT_TYPE_LABELS[investment.type]}</td>
                  <td className="px-3 py-3 text-muted-foreground">{investment.institution || "—"}</td>
                  <td className="px-3 py-3 tabular-nums">{formatCurrency(investment.investedAmount)}</td>
                  <td className="px-3 py-3 font-semibold tabular-nums">{formatCurrency(investment.currentValue)}</td>
                  <td className={cn("px-3 py-3 font-semibold tabular-nums", positive ? "text-success" : "text-destructive")}>
                    {positive ? "+" : ""}
                    {performance.returnPercent.toFixed(2)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="divide-y border-t md:hidden">
        {sorted.map((investment) => {
          const performance = investmentPerformance(investment)
          const positive = performance.returnAmount >= 0
          return (
            <ListRow
              key={investment.id}
              icon={
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Landmark className="size-5" />
                </span>
              }
              title={investment.name}
              subtitle={`${INVESTMENT_TYPE_LABELS[investment.type]} · ${investment.institution || "Sem instituição"}`}
              trailing={formatCurrency(investment.currentValue)}
              trailingSub={`${positive ? "+" : ""}${performance.returnPercent.toFixed(2)}%`}
            />
          )
        })}
      </div>
    </>
  )
}