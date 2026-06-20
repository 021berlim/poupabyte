import { CATEGORIES } from "./categories"
import type { CategoryContext } from "./category-system"
import { resolveCategory } from "./category-system"
import type { CategoryId, CategoryRef, CategoryRule, TransactionType, UserCategory } from "./types"

export interface CategorizationResult {
  category: CategoryRef
  subcategoryId?: `uc_${string}`
  confidence: number
  source: "rule" | "keyword" | "history" | "default"
}

const SYSTEM_KEYWORD_RULES: Array<{ category: CategoryId; subcategoryHints?: Array<{ terms: string[]; name: string }>; terms: string[] }> = [
  { category: "alimentacao", terms: ["MERCADO", "SUPERMERCADO", "HORTIFRUTI", "GUANABARA", "CARREFOUR", "PAO DE ACUCAR", "IFOOD", "RAPPI", "DELIVERY", "UBER EATS"], subcategoryHints: [{ terms: ["MERCADO", "SUPERMERCADO", "HORTIFRUTI", "GUANABARA"], name: "Mercado" }, { terms: ["RESTAURANTE", "LANCHONETE"], name: "Restaurante" }, { terms: ["PADARIA"], name: "Padaria" }] },
  { category: "transporte", terms: ["UBER", "99 TECNOLOGIA", "99APP", "METRO", "ONIBUS", "POSTO", "GASOLINA", "ESTACIONAMENTO", "COMBUSTIVEL"], subcategoryHints: [{ terms: ["UBER", "99"], name: "Aplicativo" }] },
  { category: "moradia", terms: ["ALUGUEL", "CONDOMINIO", "LUZ", "ENERGIA", "AGUA", "INTERNET", "VIVO", "CLARO", "TIM", "CONTA DE LUZ", "CONTA DE AGUA", "GAS", "IPTU"] },
  { category: "saude", terms: ["FARMACIA", "DROGARIA", "DROGASIL", "RAIA", "CONSULTA", "UNIMED", "AMIL"] },
  { category: "educacao", terms: ["CURSO", "ESCOLA", "FACULDADE", "UDEMY", "ALURA"] },
  { category: "lazer", terms: ["CINEMA", "INGRESSO", "STEAM", "PLAYSTATION", "JOGOS"] },
  { category: "assinaturas", terms: ["NETFLIX", "SPOTIFY", "AMAZON PRIME", "DISNEY", "YOUTUBE", "NOTION", "CANVA", "ICLOUD"], subcategoryHints: [{ terms: ["NETFLIX", "DISNEY", "PRIME"], name: "Streaming" }] },
  { category: "compras", terms: ["AMAZON", "MERCADO LIVRE", "SHOPEE", "SHEIN", "MAGAZINE"] },
  { category: "dividas", terms: ["EMPRESTIMO", "FINANCIAMENTO", "JUROS", "FATURA"] },
  { category: "investimentos", terms: ["CDB", "TESOURO", "CORRETORA", "APLICACAO", "XP INVEST"] },
  { category: "aportes", terms: ["APORTE"] },
  { category: "impostos-e-taxas", terms: ["IMPOSTO", "TAXA", "IOF", "DARF", "IPVA"] },
  { category: "pets", terms: ["PET", "PETZ", "COBASI", "VETERINAR"] },
  { category: "cuidados-pessoais", terms: ["SALAO", "BARBEARIA", "ESTETICA", "BELEZA"] },
  { category: "salario", terms: ["SALARIO", "FOLHA", "PAGAMENTO EMPRESA"] },
  { category: "reembolsos", terms: ["REEMBOLSO"] },
  { category: "rendimentos", terms: ["RENDIMENTO", "RENDIMENTOS", "DIVIDENDO", "PROVENTO", "CDB REND"] },
  { category: "renda-extra", terms: ["PIX RECEBIDO", "TRANSFERENCIA RECEBIDA", "FREELA", "FREELANCE"] },
]

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
}

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

function findSubcategoryByHint(
  parentId: CategoryRef,
  text: string,
  hints: Array<{ terms: string[]; name: string }>,
  ctx: CategoryContext,
): `uc_${string}` | undefined {
  for (const hint of hints) {
    if (!containsAny(text, hint.terms)) continue
    const existing = ctx.userCategories.find(
      (c) => c.isSubcategory && c.parentId === parentId && c.name.toLowerCase() === hint.name.toLowerCase(),
    )
    if (existing) return existing.id
  }
  return undefined
}

function matchUserKeywords(text: string, ctx: CategoryContext): CategorizationResult | null {
  for (const cat of ctx.userCategories) {
    if (!cat.active || !cat.keywords?.length) continue
    if (cat.keywords.some((kw) => text.includes(normalized(kw)))) {
      if (cat.isSubcategory && cat.parentId) {
        return { category: cat.parentId, subcategoryId: cat.id, confidence: 0.92, source: "keyword" }
      }
      return { category: cat.id, confidence: 0.9, source: "keyword" }
    }
  }
  return null
}

function matchRules(text: string, rules: CategoryRule[]): CategorizationResult | null {
  const sorted = [...rules].sort((a, b) => b.usageCount - a.usageCount)
  for (const rule of sorted) {
    if (text.includes(rule.pattern) || rule.pattern.includes(text.slice(0, Math.min(text.length, 20)))) {
      return {
        category: rule.categoryId,
        subcategoryId: rule.subcategoryId,
        confidence: Math.min(0.98, 0.75 + rule.usageCount * 0.02),
        source: "history",
      }
    }
  }
  return null
}

export function learnCategoryRule(
  description: string,
  categoryId: CategoryRef,
  subcategoryId: `uc_${string}` | undefined,
  type: TransactionType | undefined,
  rules: CategoryRule[],
): CategoryRule[] {
  const pattern = normalized(description).slice(0, 40)
  if (pattern.length < 4) return rules

  const existing = rules.find(
    (r) => r.pattern === pattern && r.categoryId === categoryId && r.subcategoryId === subcategoryId,
  )
  if (existing) {
    return rules.map((r) => (r.id === existing.id ? { ...r, usageCount: r.usageCount + 1 } : r))
  }

  return [
    ...rules,
    {
      id: `rule_${Math.random().toString(36).slice(2, 10)}`,
      pattern,
      categoryId,
      subcategoryId,
      type,
      usageCount: 1,
    },
  ]
}

export function suggestCategory(
  description: string,
  type: TransactionType,
  ctx: CategoryContext,
  rules: CategoryRule[] = [],
): CategorizationResult {
  const text = normalized(description)

  const fromRule = matchRules(text, rules)
  if (fromRule) return fromRule

  const fromUserKw = matchUserKeywords(text, ctx)
  if (fromUserKw) return fromUserKw

  if (type === "income") {
    if (containsAny(text, ["SALARIO", "FOLHA"])) return { category: "salario", confidence: 0.95, source: "keyword" }
    if (containsAny(text, ["REEMBOLSO"])) return { category: "reembolsos", confidence: 0.9, source: "keyword" }
    if (containsAny(text, ["DIVIDENDO", "PROVENTO", "RENDIMENTO"])) return { category: "rendimentos", confidence: 0.85, source: "keyword" }
    if (containsAny(text, ["PIX RECEBIDO", "TRANSFERENCIA RECEBIDA"])) return { category: "renda-extra", confidence: 0.75, source: "keyword" }
    return { category: "outras-receitas", confidence: 0.6, source: "default" }
  }

  if (type === "transfer") {
    return { category: "transferencias", confidence: 0.85, source: "default" }
  }

  for (const rule of SYSTEM_KEYWORD_RULES) {
    if (!containsAny(text, rule.terms)) continue
    const subcategoryId = rule.subcategoryHints
      ? findSubcategoryByHint(rule.category, text, rule.subcategoryHints, ctx)
      : undefined
    return { category: rule.category, subcategoryId, confidence: subcategoryId ? 0.92 : 0.9, source: "keyword" }
  }

  return { category: "nao-categorizado", confidence: 0.35, source: "default" }
}

export function formatCategoryLabel(
  categoryId: CategoryRef,
  subcategoryId: `uc_${string}` | undefined,
  ctx: CategoryContext,
): string {
  const resolved = resolveCategory(categoryId, subcategoryId, ctx)
  if (resolved.parentLabel) return `${resolved.parentLabel} › ${resolved.label}`
  return resolved.label
}