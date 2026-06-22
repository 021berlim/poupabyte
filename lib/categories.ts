import type { CategoryGroup, CategoryId, CategoryKind, CategoryRef } from "./types"

export interface CategoryMeta {
  id: CategoryId
  label: string
  color: string
  defaultType: "income" | "expense" | "both"
  group: CategoryGroup
  isSystem: true
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  // Receitas
  salario: { id: "salario", label: "Salário", color: "#22c55e", defaultType: "income", group: "receitas", isSystem: true },
  "renda-extra": { id: "renda-extra", label: "Renda extra", color: "#14b8a6", defaultType: "income", group: "receitas", isSystem: true },
  reembolsos: { id: "reembolsos", label: "Reembolsos", color: "#06b6d4", defaultType: "income", group: "receitas", isSystem: true },
  rendimentos: { id: "rendimentos", label: "Rendimentos", color: "#10b981", defaultType: "income", group: "receitas", isSystem: true },
  "outras-receitas": { id: "outras-receitas", label: "Outras receitas", color: "#0d9488", defaultType: "income", group: "receitas", isSystem: true },

  // Despesas
  moradia: { id: "moradia", label: "Moradia", color: "#8b5cf6", defaultType: "expense", group: "despesas", isSystem: true },
  alimentacao: { id: "alimentacao", label: "Alimentação", color: "#c72c3b", defaultType: "expense", group: "despesas", isSystem: true },
  transporte: { id: "transporte", label: "Transporte", color: "#3b82f6", defaultType: "expense", group: "despesas", isSystem: true },
  saude: { id: "saude", label: "Saúde", color: "#ef4444", defaultType: "expense", group: "despesas", isSystem: true },
  educacao: { id: "educacao", label: "Educação", color: "#0ea5e9", defaultType: "expense", group: "despesas", isSystem: true },
  lazer: { id: "lazer", label: "Lazer", color: "#ec4899", defaultType: "expense", group: "despesas", isSystem: true },
  compras: { id: "compras", label: "Compras", color: "#f97316", defaultType: "expense", group: "despesas", isSystem: true },
  assinaturas: { id: "assinaturas", label: "Assinaturas", color: "#8b5cf6", defaultType: "expense", group: "despesas", isSystem: true },
  familia: { id: "familia", label: "Família", color: "#f43f5e", defaultType: "expense", group: "despesas", isSystem: true },
  pets: { id: "pets", label: "Pets", color: "#84cc16", defaultType: "expense", group: "despesas", isSystem: true },
  "cuidados-pessoais": { id: "cuidados-pessoais", label: "Cuidados pessoais", color: "#db2777", defaultType: "expense", group: "despesas", isSystem: true },
  "impostos-e-taxas": { id: "impostos-e-taxas", label: "Impostos e taxas", color: "#64748b", defaultType: "expense", group: "despesas", isSystem: true },
  dividas: { id: "dividas", label: "Dívidas", color: "#dc2626", defaultType: "expense", group: "despesas", isSystem: true },
  "outros-gastos": { id: "outros-gastos", label: "Outros gastos", color: "#6b7280", defaultType: "expense", group: "despesas", isSystem: true },

  // Planejamento e patrimônio
  "reserva-emergencia": { id: "reserva-emergencia", label: "Reserva", color: "#16a34a", defaultType: "expense", group: "planejamento", isSystem: true },
  investimentos: { id: "investimentos", label: "Investimentos", color: "#22c55e", defaultType: "both", group: "planejamento", isSystem: true },
  objetivos: { id: "objetivos", label: "Metas", color: "#3b82f6", defaultType: "expense", group: "planejamento", isSystem: true },
  aportes: { id: "aportes", label: "Aportes", color: "#15803d", defaultType: "expense", group: "planejamento", isSystem: true },

  // Controle
  "cartao-credito": { id: "cartao-credito", label: "Cartão", color: "#6366f1", defaultType: "both", group: "controle", isSystem: true },
  parcelamentos: { id: "parcelamentos", label: "Parcelamentos", color: "#a855f7", defaultType: "expense", group: "controle", isSystem: true },
  transferencias: { id: "transferencias", label: "Transferências", color: "#94a3b8", defaultType: "both", group: "controle", isSystem: true },
  "nao-categorizado": { id: "nao-categorizado", label: "Sem categoria", color: "#f59e0b", defaultType: "both", group: "controle", isSystem: true },
}

export const CATEGORY_LIST = Object.values(CATEGORIES)

export const EXPENSE_CATEGORIES = CATEGORY_LIST.filter(
  (c) => c.defaultType === "expense" || c.defaultType === "both",
)

export const INCOME_CATEGORIES = CATEGORY_LIST.filter(
  (c) => c.defaultType === "income" || c.defaultType === "both",
)

export const CATEGORY_GROUP_LABELS: Record<CategoryGroup, string> = {
  receitas: "Receitas",
  despesas: "Despesas",
  planejamento: "Guardar e investir",
  controle: "Controle",
}

export const ESSENTIAL_CATEGORY_IDS: CategoryId[] = [
  "moradia",
  "alimentacao",
  "transporte",
  "saude",
  "educacao",
]

export function isSystemCategoryId(id: string): id is CategoryId {
  return id in CATEGORIES
}

export function getCategory(id: CategoryRef): CategoryMeta {
  if (isSystemCategoryId(id)) return CATEGORIES[id]
  return CATEGORIES["nao-categorizado"]
}

export function kindFromDefaultType(defaultType: CategoryMeta["defaultType"]): CategoryKind {
  if (defaultType === "income") return "income"
  if (defaultType === "expense") return "expense"
  return "expense"
}

export const FINANCIAL_OBJECTIVE_LABELS: Record<
  import("./types").FinancialObjective,
  string
> = {
  "entender-gastos": "Ver para onde vai",
  "controlar-gastos": "Gastar com controle",
  "sair-dividas": "Sair das dívidas",
  "reserva-emergencia": "Guardar dinheiro",
  "planejar-metas": "Juntar pra uma meta",
  "organizar-salario": "Organizar o salário",
  "controlar-cartao": "Controlar o cartão",
}