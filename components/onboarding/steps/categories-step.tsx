"use client"

import { createElement, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getCategory } from "@/lib/categories"
import { createCustomCategory } from "@/lib/category-system"
import { getCategoryIcon } from "@/lib/category-icons"
import { SUGGESTED_ONBOARDING_CATEGORIES } from "@/lib/parse-tabular-statement"
import type { CategoryId } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Plus } from "lucide-react"
import { OnboardingActions } from "../onboarding-actions"
import { OnboardingStepHeader } from "../onboarding-shell"

export function CategoriesStep({
  onContinue,
  onSkip,
}: {
  onContinue: (data: { suggested: CategoryId[]; customNames: string[] }) => void
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<CategoryId[]>([])
  const [customName, setCustomName] = useState("")
  const [customCategories, setCustomCategories] = useState<string[]>([])

  function toggleCategory(id: CategoryId) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function addCustom() {
    const name = customName.trim()
    if (!name || customCategories.includes(name)) return
    setCustomCategories((current) => [...current, name])
    setCustomName("")
  }

  function handleContinue() {
    onContinue({ suggested: selected, customNames: customCategories })
  }

  return (
    <div>
      <OnboardingStepHeader
        title="Organize suas categorias"
        description="Escolha sugestões ou crie uma categoria personalizada para seus gastos e receitas."
      />

      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold text-muted-foreground">Sugestões populares</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_ONBOARDING_CATEGORIES.map((id) => {
            const meta = getCategory(id)
            const active = selected.includes(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleCategory(id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-primary/35 bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {createElement(getCategoryIcon(id), {
                  className: "h-4 w-4",
                  style: { color: active ? undefined : meta.color },
                })}
                {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <Label htmlFor="onboarding-custom-category">Criar categoria personalizada</Label>
        <div className="flex gap-2">
          <Input
            id="onboarding-custom-category"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Ex.: Academia, Viagens…"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addCustom()
              }
            }}
          />
          <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={addCustom}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {customCategories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {customCategories.map((name) => (
              <span
                key={name}
                className="rounded-2xl bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <OnboardingActions onContinue={handleContinue} onSkip={onSkip} />
    </div>
  )
}

export function applyCategoryStepData(
  data: { suggested: CategoryId[]; customNames: string[] },
  addUserCategorySilent: (category: ReturnType<typeof createCustomCategory>) => void,
  showSystemCategory: (id: CategoryId) => void,
) {
  for (const id of data.suggested) {
    showSystemCategory(id)
  }
  for (const name of data.customNames) {
    addUserCategorySilent(createCustomCategory(name, "expense"))
  }
}