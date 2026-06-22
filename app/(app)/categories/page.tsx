"use client"

import { createElement, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { PageHeader } from "@/components/app/page-header"
import { StatusBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CATEGORY_GROUP_LABELS, getCategory, isSystemCategoryId } from "@/lib/categories"
import {
  buildCategoryTree,
  canEditCategory,
  createCustomCategory,
  createSubcategory,
  duplicateSystemCategory,
  getSubcategories,
  resolveCategory,
  type CategoryContext,
} from "@/lib/category-system"
import { getCategoryIcon } from "@/lib/category-icons"
import { formatCurrency } from "@/lib/format"
import { useStore } from "@/lib/store"
import type { CategoryGroup, CategoryId, CategoryKind, CategoryRef, UserCategory } from "@/lib/types"
import { Copy, EyeOff, FolderTree, Lock, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react"

const KIND_LABELS: Record<CategoryKind, string> = {
  income: "Receita",
  expense: "Despesa",
  goal: "Meta",
  investment: "Investimento",
  transfer: "Transferência",
}

function CategoryDialog({
  parentId,
  editing,
  trigger,
}: {
  parentId?: CategoryRef
  editing?: UserCategory
  trigger: ReactNode
}) {
  const { addUserCategory, updateUserCategory } = useStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [kind, setKind] = useState<CategoryKind>("expense")
  const [keywords, setKeywords] = useState("")

  function onOpenChange(next: boolean) {
    if (next) {
      setName(editing?.name ?? "")
      setKind(editing?.kind ?? "expense")
      setKeywords(editing?.keywords?.join(", ") ?? "")
    }
    setOpen(next)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    const payload: UserCategory = editing
      ? {
          ...editing,
          name: name.trim(),
          kind,
          keywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        }
      : parentId
        ? createSubcategory(parentId, name.trim(), kind)
        : createCustomCategory(name.trim(), kind)
    if (!editing && keywords.trim()) {
      payload.keywords = keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    }
    if (editing) updateUserCategory(payload)
    else addUserCategory(payload)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar categoria" : parentId ? "Nova subcategoria" : "Nova categoria"}
          </DialogTitle>
          <DialogDescription>
            {parentId ? "Detalhe gastos dentro de uma categoria." : "Use em lançamentos e limites."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="space-y-4 px-6 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Nome</Label>
              <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            {!parentId && !editing?.isSubcategory && (
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as CategoryKind)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(KIND_LABELS).map(([id, label]) => (
                      <SelectItem key={id} value={id}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="cat-keywords">Palavras-chave (opcional)</Label>
              <Input
                id="cat-keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="UBER, NETFLIX, GUANABARA"
              />
              <p className="text-xs text-muted-foreground">Usadas na categorização automática.</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="lg" className="flex-1">
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CategoryActionsMenu({
  items,
}: {
  items: Array<{ label: string; icon: ReactNode; onSelect?: () => void; destructive?: boolean; trigger?: ReactNode }>
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ações">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) =>
          item.trigger ? (
            <DropdownMenuItem key={item.label} asChild onSelect={(event) => event.preventDefault()}>
              {item.trigger}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              key={item.label}
              variant={item.destructive ? "destructive" : "default"}
              onSelect={() => item.onSelect?.()}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SystemCategoryRow({
  id,
  ctx,
  monthlySpent,
  transactionCount,
}: {
  id: CategoryId
  ctx: CategoryContext
  monthlySpent: number
  transactionCount: number
}) {
  const { addUserCategory, hideSystemCategory } = useStore()
  const category = getCategory(id)
  const Icon = getCategoryIcon(id)
  const subs = getSubcategories(ctx, id)

  return (
    <div className="px-1 py-4">
      <div className="flex items-start gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${category.color}1a`, color: category.color }}
        >
          {createElement(Icon, { className: "h-5 w-5" })}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">{category.label}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {transactionCount} transações · {formatCurrency(monthlySpent)} neste mês
              </p>
            </div>
            <CategoryActionsMenu
              items={[
                {
                  label: "Adicionar subcategoria",
                  icon: <FolderTree className="h-4 w-4" />,
                  trigger: (
                    <CategoryDialog
                      parentId={id}
                      trigger={
                        <button type="button" className="flex w-full items-center gap-2">
                          <FolderTree className="h-4 w-4" />
                          Adicionar subcategoria
                        </button>
                      }
                    />
                  ),
                },
                {
                  label: "Ocultar categoria",
                  icon: <EyeOff className="h-4 w-4" />,
                  onSelect: () => hideSystemCategory(id),
                },
                {
                  label: "Duplicar",
                  icon: <Copy className="h-4 w-4" />,
                  onSelect: () => addUserCategory(duplicateSystemCategory(id, ctx)),
                },
              ]}
            />
          </div>
          {subs.length > 0 && (
            <div className="relative mt-3 ml-[1.375rem] space-y-0 pl-4">
              <span aria-hidden className="absolute bottom-1 left-0 top-0 w-px bg-border" />
              {subs.map((sub) => (
                <div key={sub.id} className="relative py-1.5">
                  <span aria-hidden className="absolute -left-4 top-1/2 h-px w-4 -translate-y-1/2 bg-border" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{sub.label}</span> · Personalizada
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CustomCategoryRow({ category, ctx }: { category: UserCategory; ctx: CategoryContext }) {
  const { deleteUserCategory } = useStore()
  const resolved = resolveCategory(category.id, undefined, ctx)
  const subs = category.isSubcategory ? [] : getSubcategories(ctx, category.id)

  const menuItems = canEditCategory(category.id)
    ? [
        ...(!category.isSubcategory
          ? [
              {
                label: "Adicionar subcategoria",
                icon: <FolderTree className="h-4 w-4" />,
                trigger: (
                  <CategoryDialog
                    parentId={category.id}
                    trigger={
                      <button type="button" className="flex w-full items-center gap-2">
                        <FolderTree className="h-4 w-4" />
                        Adicionar subcategoria
                      </button>
                    }
                  />
                ),
              },
            ]
          : []),
        {
          label: "Editar",
          icon: <Pencil className="h-4 w-4" />,
          trigger: (
            <CategoryDialog
              editing={category}
              trigger={
                <button type="button" className="flex w-full items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  Editar
                </button>
              }
            />
          ),
        },
        {
          label: "Excluir",
          icon: <Trash2 className="h-4 w-4" />,
          destructive: true,
          onSelect: () => deleteUserCategory(category.id),
        },
      ]
    : []

  return (
    <div className="px-1 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold">{resolved.label}</h2>
            <StatusBadge tone="warning">Personalizada</StatusBadge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {KIND_LABELS[category.kind]}
            {category.parentId && ` · dentro de ${resolveCategory(category.parentId, undefined, ctx).label}`}
          </p>
          {subs.length > 0 && (
            <div className="relative mt-3 ml-3 space-y-0 pl-4">
              <span aria-hidden className="absolute bottom-1 left-0 top-0 w-px bg-border" />
              {subs.map((sub) => (
                <div key={sub.id} className="relative py-1.5">
                  <span aria-hidden className="absolute -left-4 top-1/2 h-px w-4 -translate-y-1/2 bg-border" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{sub.label}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        {menuItems.length > 0 ? <CategoryActionsMenu items={menuItems} /> : null}
      </div>
    </div>
  )
}

export default function CategoriesPage() {
  const { transactions, userCategories, hiddenSystemCategories } = useStore()
  const [showAll, setShowAll] = useState(false)
  const ctx: CategoryContext = useMemo(
    () => ({ userCategories, hiddenSystemCategories }),
    [userCategories, hiddenSystemCategories],
  )
  const tree = useMemo(() => buildCategoryTree(ctx, transactions), [ctx, transactions])

  const groups = useMemo(() => {
    const map = new Map<CategoryGroup, typeof tree>()
    for (const node of tree) {
      if (!node.category.group) continue
      const list = map.get(node.category.group) ?? []
      list.push(node)
      map.set(node.category.group, list)
    }
    return map
  }, [tree])

  const customTopLevel = userCategories.filter((c) => c.active && !c.isSubcategory && !c.basedOnSystemId)
  const hiddenCount = tree.filter((node) => isSystemCategoryId(node.category.id) && (node.transactionCount ?? 0) === 0).length

  function filterNodes(nodes: typeof tree) {
    if (showAll) return nodes
    return nodes.filter((node) => (node.transactionCount ?? 0) > 0 || (node.monthlySpent ?? 0) > 0)
  }

  return (
    <div className="min-w-0 space-y-[clamp(1rem,3vw,1.5rem)]">
      <PageHeader
        title="Categorias"
        subtitle="Como você classifica gastos."
        action={
          <CategoryDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                Nova categoria
              </Button>
            }
          />
        }
      />

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" />
          <span>Categorias padrão do sistema não podem ser editadas.</span>
        </div>
        {hiddenCount > 0 ? (
          <Button variant="ghost" size="sm" className="shrink-0 text-xs" onClick={() => setShowAll((value) => !value)}>
            {showAll ? "Mostrar só usadas" : "Mostrar todas"}
          </Button>
        ) : null}
      </div>

      {(Object.keys(CATEGORY_GROUP_LABELS) as CategoryGroup[]).map((group) => {
        const nodes = filterNodes(groups.get(group) ?? [])
        if (!nodes.length) return null
        return (
          <section key={group}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {CATEGORY_GROUP_LABELS[group]}
            </h2>
            <div className="divide-y border-t">
              {nodes.map((node) =>
                isSystemCategoryId(node.category.id) ? (
                  <SystemCategoryRow
                    key={node.category.id}
                    id={node.category.id}
                    ctx={ctx}
                    monthlySpent={node.monthlySpent ?? 0}
                    transactionCount={node.transactionCount ?? 0}
                  />
                ) : null,
              )}
            </div>
          </section>
        )
      })}

      {customTopLevel.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Suas categorias
          </h2>
          <div className="divide-y border-t">
            {customTopLevel.map((cat) => (
              <CustomCategoryRow key={cat.id} category={cat} ctx={ctx} />
            ))}
          </div>
        </section>
      )}

      {userCategories.filter((c) => c.isSubcategory).length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Subcategorias
          </h2>
          <div className="divide-y border-t">
            {userCategories
              .filter((c) => c.active && c.isSubcategory)
              .map((cat) => (
                <CustomCategoryRow key={cat.id} category={cat} ctx={ctx} />
              ))}
          </div>
        </section>
      )}
    </div>
  )
}