"use client"

import * as m from "motion/react-m"
import { useStore } from "@/lib/store"
import { FeatureCard } from "@/components/app/feature-card"
import { expenseByCategory } from "@/lib/selectors"
import { formatCurrency } from "@/lib/format"
import { getCategoryIcon } from "@/lib/category-icons"
import { defaultTransition, fadeInUp, staggerContainer } from "@/src/lib/animations"
import { PieChart } from "lucide-react"

export function CategorySummary({ animationDelay = 0 }: { animationDelay?: number }) {
 const { transactions } = useStore()
 const breakdown = expenseByCategory(transactions, new Date()).slice(0, 5)
 const total = breakdown.reduce((acc, b) => acc + b.total, 0)

 return (
  <FeatureCard delay={animationDelay} tone="planning" className="h-full min-w-0 p-[clamp(1rem,3vw,1.5rem)]">
   <div className="flex items-start justify-between gap-4">
    <div className="min-w-0">
     <p className="text-xs font-semibold text-foreground/60">Categorias</p>
     <h2 className="mt-1 text-xl font-extrabold text-foreground">Resumo financeiro</h2>
     <p className="mt-1 text-sm text-foreground/55">Despesas por categoria neste mês</p>
    </div>
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-foreground">
     <PieChart className="h-5 w-5" />
    </span>
   </div>

   {breakdown.length === 0 ? (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
     <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
      <PieChart className="h-5 w-5" />
     </span>
     <div>
      <p className="text-sm font-bold text-foreground">Nenhuma despesa registrada</p>
      <p className="mt-1 text-xs text-foreground/55">As categorias aparecem quando houver movimentações.</p>
     </div>
    </div>
   ) : (
    <m.ul
     className="mt-5 divide-y"
     initial="hidden"
     whileInView="show"
     viewport={{ once: true, amount: 0.28 }}
     variants={staggerContainer}
    >
     {breakdown.map((b) => {
      const Icon = getCategoryIcon(b.category)
      const percent = total > 0 ? (b.total / total) * 100 : 0
      return (
       <m.li
        key={b.category}
        variants={fadeInUp}
        transition={defaultTransition}
        className="app-row-hover py-[clamp(0.875rem,2.5vw,1rem)]"
       >
        <div className="flex items-center gap-3">
         <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl "
          style={{ backgroundColor: `${b.color}1f`, color: b.color }}
         >
          <Icon className="h-5 w-5" />
         </span>
         <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
           <span className="truncate text-sm font-bold text-foreground">{b.label}</span>
           <span className="max-w-[48%] shrink-0 truncate text-right text-sm font-extrabold tabular-nums text-foreground">
            {formatCurrency(b.total)}
           </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
           <div className="h-2.5 flex-1 overflow-hidden rounded-[4px] bg-primary/10 ">
            <div
             className="h-full w-full origin-left rounded-[4px] transition-transform duration-500"
             style={{
              transform: `scaleX(${Math.min(percent, 100) / 100})`,
              background: `linear-gradient(90deg, ${b.color}, ${b.color}cc)`,
             }}
            />
           </div>
           <span className="w-10 text-right text-[11px] font-bold tabular-nums text-foreground/55">
            {Math.round(percent)}%
           </span>
          </div>
         </div>
        </div>
       </m.li>
      )
     })}
    </m.ul>
   )}
  </FeatureCard>
 )
}
