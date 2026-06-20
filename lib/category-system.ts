import { CATEGORIES, CATEGORY_GROUP_LABELS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategory, isSystemCategoryId } from "./categories"
import type { CategoryGroup, CategoryId, CategoryKind, CategoryRef, Transaction, UserCategory } from "./types"

export interface ResolvedCategory {
  id: CategoryRef
  label: string
  color: string
  kind: CategoryKind
  isSystem: boolean
  group?: CategoryGroup
  parentId?: CategoryRef
  parentLabel?: string
}

export interface CategoryTreeNode {
  category: ResolvedCategory
  subcategories: ResolvedCategory[]
  monthlySpent?: number
  transactionCount?: number
}

export interface CategoryContext {
  userCategories: UserCategory[]
  hiddenSystemCategories: CategoryId[]
}

export function isCustomCategoryId(id: string): id is `uc_${string}` {
  return id.startsWith("uc_")
}

export function isSystemCategory(id: CategoryRef): boolean {
  return isSystemCategoryId(id)
}

export function canEditCategory(id: CategoryRef): boolean {
  return !isSystemCategory(id)
}

export function resolveCategory(
  id: CategoryRef,
  subcategoryId: `uc_${string}` | undefined,
  ctx: CategoryContext,
): ResolvedCategory {
  if (subcategoryId) {
    const sub = ctx.userCategories.find((c) => c.id === subcategoryId && c.active)
    if (sub) {
      const parent = resolveCategory(sub.parentId ?? id, undefined, ctx)
      return {
        id: sub.id,
        label: sub.name,
        color: sub.color ?? parent.color,
        kind: sub.kind,
        isSystem: false,
        parentId: parent.id,
        parentLabel: parent.label,
      }
    }
  }

  if (isCustomCategoryId(id)) {
    const custom = ctx.userCategories.find((c) => c.id === id && c.active)
    if (custom) {
      const parent = custom.parentId ? resolveCategory(custom.parentId, undefined, ctx) : undefined
      return {
        id: custom.id,
        label: custom.name,
        color: custom.color ?? "#64748b",
        kind: custom.kind,
        isSystem: false,
        parentId: custom.parentId,
        parentLabel: parent?.label,
      }
    }
  }

  const system = getCategory(id)
  return {
    id,
    label: system.label,
    color: system.color,
    kind: system.defaultType === "income" ? "income" : system.defaultType === "expense" ? "expense" : "expense",
    isSystem: true,
    group: system.group,
  }
}

export function resolveTransactionCategory(tx: Transaction, ctx: CategoryContext): ResolvedCategory {
  return resolveCategory(tx.category, tx.subcategoryId, ctx)
}

export function getVisibleSystemCategories(ctx: CategoryContext, kind?: CategoryKind): ResolvedCategory[] {
  const hidden = new Set(ctx.hiddenSystemCategories)
  const list = kind === "income" ? INCOME_CATEGORIES : kind === "expense" ? EXPENSE_CATEGORIES : Object.values(CATEGORIES)
  return list
    .filter((c) => !hidden.has(c.id))
    .map((c) => ({
      id: c.id,
      label: c.label,
      color: c.color,
      kind: c.defaultType === "income" ? "income" : c.defaultType === "expense" ? "expense" : "expense",
      isSystem: true,
      group: c.group,
    }))
}

export function getVisibleCustomCategories(ctx: CategoryContext, parentId?: CategoryRef): UserCategory[] {
  return ctx.userCategories.filter((c) => {
    if (!c.active) return false
    if (parentId !== undefined) return c.parentId === parentId
    return !c.isSubcategory || !c.parentId
  })
}

export function getSubcategories(ctx: CategoryContext, parentId: CategoryRef): ResolvedCategory[] {
  return ctx.userCategories
    .filter((c) => c.active && c.isSubcategory && c.parentId === parentId)
    .map((c) => resolveCategory(c.id, undefined, ctx))
}

export function buildCategoryTree(ctx: CategoryContext, transactions: Transaction[], ref?: Date): CategoryTreeNode[] {
  const monthKey = ref
    ? `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`
    : null

  const monthTxs = monthKey
    ? transactions.filter((t) => t.date.slice(0, 7) === monthKey && t.type === "expense")
    : transactions.filter((t) => t.type === "expense")

  const nodes: CategoryTreeNode[] = []

  for (const group of Object.keys(CATEGORY_GROUP_LABELS) as CategoryGroup[]) {
    const systemCats = Object.values(CATEGORIES).filter((c) => c.group === group && c.defaultType !== "income")
    for (const sys of systemCats) {
      if (ctx.hiddenSystemCategories.includes(sys.id)) continue
      const catTxs = monthTxs.filter((t) => t.category === sys.id)
      const subs = getSubcategories(ctx, sys.id)
      nodes.push({
        category: resolveCategory(sys.id, undefined, ctx),
        subcategories: subs,
        monthlySpent: catTxs.reduce((a, t) => a + t.amount, 0),
        transactionCount: catTxs.length,
      })
    }
  }

  const topLevelCustom = ctx.userCategories.filter((c) => c.active && !c.isSubcategory)
  for (const custom of topLevelCustom) {
    const catTxs = monthTxs.filter((t) => t.category === custom.id || t.subcategoryId && ctx.userCategories.find((s) => s.id === t.subcategoryId)?.parentId === custom.id)
    nodes.push({
      category: resolveCategory(custom.id, undefined, ctx),
      subcategories: getSubcategories(ctx, custom.id),
      monthlySpent: catTxs.reduce((a, t) => a + t.amount, 0),
      transactionCount: catTxs.length,
    })
  }

  return nodes
}

export function expenseBySubcategory(
  txs: Transaction[],
  ctx: CategoryContext,
  ref?: Date,
): Array<{ parentId: CategoryRef; parentLabel: string; subcategoryId: `uc_${string}`; label: string; total: number; color: string }> {
  const monthTxs = txs.filter((t) => {
    if (t.type !== "expense" || !t.subcategoryId) return false
    if (!ref) return true
    return t.date.slice(0, 7) === `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`
  })

  const map = new Map<string, number>()
  for (const tx of monthTxs) {
    if (!tx.subcategoryId) continue
    map.set(tx.subcategoryId, (map.get(tx.subcategoryId) ?? 0) + tx.amount)
  }

  return Array.from(map.entries())
    .map(([subId, total]) => {
      const resolved = resolveCategory(subId as `uc_${string}`, undefined, ctx)
      const parent = resolved.parentId ? resolveCategory(resolved.parentId, undefined, ctx) : resolved
      return {
        parentId: parent.id,
        parentLabel: parent.label,
        subcategoryId: subId as `uc_${string}`,
        label: resolved.label,
        total,
        color: resolved.color,
      }
    })
    .sort((a, b) => b.total - a.total)
}

export function selectableCategories(ctx: CategoryContext, kind?: "income" | "expense" | "all"): Array<ResolvedCategory & { depth: number }> {
  const items: Array<ResolvedCategory & { depth: number }> = []

  const systemList =
    kind === "income"
      ? getVisibleSystemCategories(ctx, "income")
      : kind === "expense"
        ? getVisibleSystemCategories(ctx, "expense")
        : [...getVisibleSystemCategories(ctx, "income"), ...getVisibleSystemCategories(ctx, "expense")]

  for (const cat of systemList) {
    items.push({ ...cat, depth: 0 })
    for (const sub of getSubcategories(ctx, cat.id)) {
      items.push({ ...sub, depth: 1 })
    }
  }

  const customTop = ctx.userCategories.filter((c) => c.active && !c.isSubcategory && !c.basedOnSystemId)
  for (const custom of customTop) {
    const resolved = resolveCategory(custom.id, undefined, ctx)
    if (kind === "income" && resolved.kind !== "income") continue
    if (kind === "expense" && resolved.kind === "income") continue
    items.push({ ...resolved, depth: 0 })
    for (const sub of getSubcategories(ctx, custom.id)) {
      items.push({ ...sub, depth: 1 })
    }
  }

  return items
}

export function duplicateSystemCategory(systemId: CategoryId, ctx: CategoryContext, name?: string): UserCategory {
  const system = getCategory(systemId)
  return {
    id: `uc_${Math.random().toString(36).slice(2, 10)}` as `uc_${string}`,
    name: name ?? `${system.label} (personalizada)`,
    kind: system.defaultType === "income" ? "income" : "expense",
    basedOnSystemId: systemId,
    active: true,
    isSubcategory: false,
    color: system.color,
  }
}

export function createSubcategory(parentId: CategoryRef, name: string, kind: CategoryKind): UserCategory {
  return {
    id: `uc_${Math.random().toString(36).slice(2, 10)}` as `uc_${string}`,
    name,
    kind,
    parentId,
    active: true,
    isSubcategory: true,
  }
}

export function createCustomCategory(name: string, kind: CategoryKind): UserCategory {
  return {
    id: `uc_${Math.random().toString(36).slice(2, 10)}` as `uc_${string}`,
    name,
    kind,
    active: true,
    isSubcategory: false,
  }
}