import {
  getEffectivePlanningIncome,
  getIncomePlanningMultiplier,
  usesFlexiblePlanning,
} from "./income"
import type {
  BudgetWeight,
  BusinessSeparation,
  CategoryId,
  FinancialObjective,
  FinancialProfile,
  Goal,
  IncomeType,
  IncomeVariability,
  SpendingLimit,
} from "./types"

export type OnboardingIncomeData = {
  incomeType: IncomeType
  monthlyIncome: number
  salaryDay?: number
  incomeVariability?: IncomeVariability
  businessSeparation?: BusinessSeparation
}

export type OnboardingGoalData = {
  name: string
  target: number
  deadline: string
}

export type OnboardingAnswers = {
  income: OnboardingIncomeData
  objective: FinancialObjective
  budgetWeight: BudgetWeight
  goal?: OnboardingGoalData
}

export const INCOME_TYPE_OPTIONS: Array<{
  value: IncomeType
  label: string
}> = [
  { value: "salario-fixo", label: "Tenho salário fixo" },
  { value: "autonomo", label: "Trabalho por conta própria" },
  { value: "negocio-proprio", label: "Tenho meu próprio negócio" },
  { value: "renda-variavel", label: "Minha renda varia" },
  { value: "ocasional", label: "Recebo dinheiro às vezes" },
  { value: "sem-renda", label: "Ainda não tenho renda" },
]

export const INCOME_VARIABILITY_OPTIONS: Array<{
  value: IncomeVariability
  label: string
}> = [
  { value: "pouco", label: "Varia pouco" },
  { value: "bastante", label: "Varia bastante" },
  { value: "nao-sei", label: "Não sei ainda" },
]

export const BUSINESS_SEPARATION_OPTIONS: Array<{
  value: BusinessSeparation
  label: string
}> = [
  { value: "sim", label: "Sim" },
  { value: "ainda-nao", label: "Ainda não" },
  { value: "as-vezes", label: "Às vezes" },
]

export const INCOME_FIELD_HELP: Record<IncomeType, string> = {
  "salario-fixo": "Vamos usar esse valor para calcular limites, metas e previsões.",
  autonomo: "Use uma média aproximada. Você poderá ajustar depois.",
  "negocio-proprio":
    "Informe o valor que costuma tirar para você, não o faturamento do negócio.",
  "renda-variavel": "Se não souber agora, você pode pular e registrar entradas depois.",
  ocasional: "Esse campo é opcional. Você pode começar sem informar renda fixa.",
  "sem-renda":
    "Sem problema. Você pode usar o PoupaByte para acompanhar gastos e registrar entradas quando receber algum valor.",
}

export const PENNY_INCOME_MESSAGES: Record<IncomeType, string> = {
  "salario-fixo": "Vou adaptar seus limites ao seu tipo de renda.",
  autonomo: "Uso uma média segura e ajusto conforme o dinheiro entrar.",
  "negocio-proprio": "Só conto o que você retira para você — não o faturamento.",
  "renda-variavel": "Seus limites se ajustam conforme você registra entradas.",
  ocasional: "Vamos acompanhar o que entra e o que sai, sem renda fixa.",
  "sem-renda": "Comece pelos gastos. Cadastre entradas quando receber.",
}

export function pennyIncomeMessage(incomeType: IncomeType): string {
  return PENNY_INCOME_MESSAGES[incomeType]
}

export function incomeFieldHelp(incomeType: IncomeType): string {
  return INCOME_FIELD_HELP[incomeType]
}

export function incomeTypeRequiresAmount(incomeType: IncomeType): boolean {
  return incomeType === "salario-fixo" || incomeType === "autonomo" || incomeType === "negocio-proprio"
}

export function incomeTypeAllowsOptionalAmount(incomeType: IncomeType): boolean {
  return incomeType === "renda-variavel" || incomeType === "ocasional"
}

export const FINANCIAL_MOMENT_OPTIONS: Array<{
  value: FinancialObjective
  label: string
  shortLabel: string
  description: string
}> = [
  {
    value: "entender-gastos",
    label: "Ver para onde o dinheiro vai",
    shortLabel: "Ver para onde o dinheiro vai",
    description: "Resumo por categoria e gráficos simples.",
  },
  {
    value: "controlar-gastos",
    label: "Controlar gastos do mês",
    shortLabel: "Controlar gastos do mês",
    description: "Limites e alertas para não passar do planejado.",
  },
  {
    value: "sair-dividas",
    label: "Organizar dívidas",
    shortLabel: "Organizar dívidas",
    description: "Veja parcelas, atrasos e impacto na renda.",
  },
  {
    value: "reserva-emergencia",
    label: "Começar a guardar dinheiro",
    shortLabel: "Começar a guardar dinheiro",
    description: "Crie uma reserva aos poucos.",
  },
  {
    value: "planejar-metas",
    label: "Guardar para uma meta",
    shortLabel: "Guardar para uma meta",
    description: "Defina valor, prazo e acompanhe o progresso.",
  },
]

/** Grade 2x2 + destaque — cabe na tela sem rolagem */
export const FINANCIAL_MOMENT_LAYOUT: FinancialObjective[][] = [
  ["entender-gastos", "controlar-gastos"],
  ["sair-dividas", "reserva-emergencia"],
  ["planejar-metas"],
]

export const BUDGET_WEIGHT_OPTIONS: Array<{
  value: BudgetWeight
  label: string
}> = [
  { value: "alimentacao", label: "Alimentação" },
  { value: "transporte", label: "Transporte" },
  { value: "moradia", label: "Moradia" },
  { value: "cartao-credito", label: "Cartão de crédito" },
  { value: "dividas", label: "Dívidas" },
  { value: "lazer", label: "Lazer" },
  { value: "nao-sei", label: "Ainda não sei" },
]

export const BUDGET_WEIGHT_UNSURE_HELP =
  "Tudo bem. A Penny identifica isso conforme você registra seus gastos."

export const BUDGET_WEIGHT_GROUPS: Array<{
  label: string
  values: BudgetWeight[]
}> = [
  { label: "Dia a dia", values: ["alimentacao", "transporte", "moradia"] },
  { label: "Compromissos", values: ["cartao-credito", "dividas"] },
  { label: "Outros", values: ["lazer", "nao-sei"] },
]

export function financialMomentLabel(value: FinancialObjective, compact = true): string {
  const option = FINANCIAL_MOMENT_OPTIONS.find((item) => item.value === value)
  if (!option) return value
  return compact ? option.shortLabel : option.label
}

export function financialMomentDescription(value: FinancialObjective): string | undefined {
  return FINANCIAL_MOMENT_OPTIONS.find((item) => item.value === value)?.description
}

export function budgetWeightLabel(value: BudgetWeight): string {
  return BUDGET_WEIGHT_OPTIONS.find((item) => item.value === value)?.label ?? value
}

const BUDGET_WEIGHT_LIMIT_SHARE: Record<Exclude<BudgetWeight, "nao-sei">, number> = {
  alimentacao: 0.2,
  transporte: 0.15,
  moradia: 0.3,
  "cartao-credito": 0.12,
  dividas: 0.15,
  lazer: 0.1,
}

const CONTROL_GASTOS_LIMITS: Array<{ category: CategoryId; share: number }> = [
  { category: "alimentacao", share: 0.18 },
  { category: "lazer", share: 0.08 },
  { category: "compras", share: 0.1 },
]

const PRIMARY_COLOR = "#c72c3b"

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function suggestMonthlyReserve(
  monthlyIncome: number,
  objective: FinancialObjective,
  incomeType?: IncomeType,
): number {
  if (objective !== "reserva-emergencia") return 0
  if (incomeType === "sem-renda" || incomeType === "ocasional") return 0
  if (monthlyIncome <= 0) return 0
  const multiplier = incomeType ? getIncomePlanningMultiplier({ incomeType }) : 1
  return roundMoney(monthlyIncome * multiplier * 0.1)
}

export function buildInitialLimits(
  monthlyIncome: number,
  objective: FinancialObjective,
  budgetWeight: BudgetWeight,
  incomeType?: IncomeType,
  incomeVariability?: IncomeVariability,
): SpendingLimit[] {
  if (monthlyIncome <= 0 || incomeType === "sem-renda") return []

  const multiplier = incomeType
    ? getIncomePlanningMultiplier({ incomeType, incomeVariability })
    : 1
  const incomeBase = roundMoney(monthlyIncome * multiplier)
  if (incomeBase <= 0) return []

  const limits: SpendingLimit[] = []
  const seen = new Set<string>()

  function pushLimit(category: CategoryId, share: number) {
    const key = category
    if (seen.has(key)) return
    seen.add(key)
    limits.push({
      id: `lim_onboard_${category}`,
      category,
      amount: roundMoney(incomeBase * share),
      alertPercent: incomeType && usesFlexiblePlanning(incomeType) ? 70 : 80,
    })
  }

  if (budgetWeight !== "nao-sei") {
    pushLimit(budgetWeight, BUDGET_WEIGHT_LIMIT_SHARE[budgetWeight])
  }

  if (objective === "controlar-gastos" && incomeType !== "ocasional") {
    for (const item of CONTROL_GASTOS_LIMITS) {
      pushLimit(item.category, item.share)
    }
  }

  if (objective === "sair-dividas") {
    pushLimit("dividas", 0.15)
    pushLimit("parcelamentos", 0.12)
    pushLimit("cartao-credito", 0.1)
  }

  return limits
}

export function buildOnboardingGoal(goal: OnboardingGoalData): Omit<Goal, "id"> {
  return {
    name: goal.name.trim(),
    target: goal.target,
    current: 0,
    deadline: goal.deadline,
    color: PRIMARY_COLOR,
  }
}

export function applyOnboardingAnswers(
  answers: OnboardingAnswers,
  currentProfile: FinancialProfile,
): {
  profile: FinancialProfile
  limits: SpendingLimit[]
  goal?: Omit<Goal, "id">
} {
  const { income, objective, budgetWeight, goal } = answers
  const monthlyIncome = Math.max(0, income.monthlyIncome)
  const salaryDay =
    income.incomeType === "salario-fixo" && income.salaryDay
      ? income.salaryDay
      : currentProfile.salaryDay ?? 1
  const monthlyReserve = suggestMonthlyReserve(monthlyIncome, objective, income.incomeType)

  const profile: FinancialProfile = {
    ...currentProfile,
    monthlySalary: monthlyIncome,
    salaryDay,
    expectedExtraIncome: 0,
    extraIncomeFrequency: "none",
    incomeType: income.incomeType,
    incomeVariability: income.incomeVariability,
    businessSeparation: income.businessSeparation,
    budgetWeight,
    objective,
    monthlyReserve,
    configured: true,
    currency: "BRL",
    salaryHistory: [
      {
        effectiveFrom: new Date().toISOString().slice(0, 7),
        monthlySalary: monthlyIncome,
        salaryDay,
        expectedExtraIncome: 0,
        monthlyReserve,
        objective,
      },
    ],
  }

  const limits = buildInitialLimits(
    monthlyIncome,
    objective,
    budgetWeight,
    income.incomeType,
    income.incomeVariability,
  )
  const goalPayload = goal ? buildOnboardingGoal(goal) : undefined

  return { profile, limits, goal: goalPayload }
}

export type DashboardFocus = {
  welcomeTitle: string
  welcomeHint: string
  primaryCta: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
  showGoalsFirst: boolean
  showLimitsProminent: boolean
  showCommittedPercent: boolean
  showReserveSplit: boolean
  showCategoryReports: boolean
  showIncomeTracking: boolean
  pennyAnalysisPrompt: string
}

function incomeTrackingHint(incomeType?: IncomeType): string | null {
  switch (incomeType) {
    case "autonomo":
      return "Cadastre cada entrada e o mês se ajusta."
    case "renda-variavel":
      return "Quanto mais você registra, melhor ficam suas análises."
    case "ocasional":
      return "Cadastre o que entrar, sem renda fixa."
    case "sem-renda":
      return "Cadastre entradas quando receber."
    default:
      return null
  }
}

export function getDashboardFocus(
  objective: FinancialObjective,
  budgetWeight?: BudgetWeight,
  incomeType?: IncomeType,
): DashboardFocus {
  const weightLabel =
    budgetWeight && budgetWeight !== "nao-sei"
      ? BUDGET_WEIGHT_OPTIONS.find((item) => item.value === budgetWeight)?.label
      : null
  const incomeHint = incomeTrackingHint(incomeType)
  const flexibleIncome = incomeType ? usesFlexiblePlanning(incomeType) : false

  const base = (focus: DashboardFocus): DashboardFocus => {
    if (!incomeHint) return focus
    return {
      ...focus,
      welcomeHint: `${focus.welcomeHint} ${incomeHint}`,
      showIncomeTracking: flexibleIncome,
    }
  }

  switch (objective) {
    case "entender-gastos":
      return base({
        welcomeTitle: flexibleIncome ? "Acompanhe entradas e gastos" : "Veja para onde o dinheiro vai",
        welcomeHint: weightLabel
          ? `Registre ${weightLabel.toLowerCase()} e acompanhe por categoria.`
          : "Registre gastos e acompanhe por categoria.",
        primaryCta: { label: "Novo gasto", href: "/transactions" },
        secondaryCta: { label: "Relatórios", href: "/reports" },
        showGoalsFirst: false,
        showLimitsProminent: false,
        showCommittedPercent: false,
        showReserveSplit: false,
        showCategoryReports: true,
        showIncomeTracking: flexibleIncome,
        pennyAnalysisPrompt: "Onde foi meu dinheiro?",
      })
    case "controlar-gastos":
      return base({
        welcomeTitle: "Controlar gastos do mês",
        welcomeHint: weightLabel
          ? `Veja quanto ainda pode gastar em ${weightLabel.toLowerCase()}.`
          : "Acompanhe limites e alertas do mês.",
        primaryCta: { label: "Ver limites", href: "/limits" },
        secondaryCta: { label: "Relatórios", href: "/reports" },
        showGoalsFirst: false,
        showLimitsProminent: incomeType !== "sem-renda" && incomeType !== "ocasional",
        showCommittedPercent: false,
        showReserveSplit: false,
        showCategoryReports: false,
        showIncomeTracking: flexibleIncome,
        pennyAnalysisPrompt: "Quanto posso gastar?",
      })
    case "sair-dividas":
      return base({
        welcomeTitle: "Organizar dívidas",
        welcomeHint: flexibleIncome
          ? "Acompanhe parcelas, atrasos e impacto conforme o dinheiro entrar."
          : "Veja parcelas, atrasos e o que já tem destino este mês.",
        primaryCta: { label: "Cadastrar dívida", href: "/profile" },
        secondaryCta: { label: "Ver mês", href: "/cashflow" },
        showGoalsFirst: false,
        showLimitsProminent: true,
        showCommittedPercent: incomeType !== "sem-renda" && incomeType !== "ocasional",
        showReserveSplit: false,
        showCategoryReports: false,
        showIncomeTracking: flexibleIncome,
        pennyAnalysisPrompt: "Como estão minhas dívidas?",
      })
    case "reserva-emergencia":
      return base({
        welcomeTitle: "Começar a guardar dinheiro",
        welcomeHint:
          incomeType === "sem-renda" || incomeType === "ocasional"
            ? "Guarde o que der — mesmo pouco conta."
            : "Separe uma reserva aos poucos, todo mês.",
        primaryCta: { label: "Ver reserva", href: "/investments" },
        secondaryCta: { label: "Ajustar", href: "/profile" },
        showGoalsFirst: false,
        showLimitsProminent: false,
        showCommittedPercent: false,
        showReserveSplit: incomeType !== "sem-renda",
        showCategoryReports: false,
        showIncomeTracking: flexibleIncome,
        pennyAnalysisPrompt: "Quanto guardar por mês?",
      })
    case "planejar-metas":
      return base({
        welcomeTitle: "Guardar para uma meta",
        welcomeHint:
          incomeType === "ocasional" || incomeType === "sem-renda"
            ? "Comece com metas pequenas e ajuste depois."
            : "Acompanhe o progresso e quanto guardar por mês.",
        primaryCta: { label: "Ver metas", href: "/goals" },
        secondaryCta: { label: "Nova meta", href: "/goals" },
        showGoalsFirst: true,
        showLimitsProminent: false,
        showCommittedPercent: false,
        showReserveSplit: false,
        showCategoryReports: false,
        showIncomeTracking: flexibleIncome,
        pennyAnalysisPrompt: "Minha meta é viável?",
      })
    default:
      return base({
        welcomeTitle: "Tudo pronto",
        welcomeHint: "Registre gastos e entradas no dia a dia.",
        primaryCta: { label: "Novo gasto", href: "/transactions" },
        showGoalsFirst: false,
        showLimitsProminent: false,
        showCommittedPercent: false,
        showReserveSplit: false,
        showCategoryReports: false,
        showIncomeTracking: flexibleIncome,
        pennyAnalysisPrompt: "Ver análise da Penny",
      })
  }
}

export function getPlanningIncomeForProfile(profile: FinancialProfile, ref = new Date()): number {
  return getEffectivePlanningIncome(profile, ref)
}