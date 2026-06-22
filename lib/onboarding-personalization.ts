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
  { value: "salario-fixo", label: "Salário fixo" },
  { value: "autonomo", label: "Autônomo" },
  { value: "negocio-proprio", label: "Negócio próprio" },
  { value: "renda-variavel", label: "Renda variável" },
  { value: "ocasional", label: "Às vezes" },
  { value: "sem-renda", label: "Sem renda" },
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

export const PENNY_INCOME_MESSAGES: Record<IncomeType, string> = {
  "salario-fixo": "Monto seu mês pelo valor e dia que você recebe.",
  autonomo: "Uso uma média segura e ajusto conforme o dinheiro entrar.",
  "negocio-proprio": "Só conto o que você retira pra você — não o faturamento.",
  "renda-variavel": "Seus limites se ajustam conforme as entradas.",
  ocasional: "Vamos ver o que entra e o que sai. Sem renda fixa.",
  "sem-renda": "Comece pelos gastos. Cadastre entradas quando receber.",
}

export function pennyIncomeMessage(incomeType: IncomeType): string {
  return PENNY_INCOME_MESSAGES[incomeType]
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
    label: "Ver pra onde vai o dinheiro",
    shortLabel: "Entender gastos",
    description: "Por categoria",
  },
  {
    value: "controlar-gastos",
    label: "Parar de gastar sem perceber",
    shortLabel: "Controlar gastos",
    description: "Limites no mês",
  },
  {
    value: "sair-dividas",
    label: "Sair das dívidas",
    shortLabel: "Sair das dívidas",
    description: "Parcelas e cartão",
  },
  {
    value: "reserva-emergencia",
    label: "Guardar dinheiro",
    shortLabel: "Guardar dinheiro",
    description: "Reserva mensal",
  },
  {
    value: "planejar-metas",
    label: "Alcançar uma meta",
    shortLabel: "Alcançar meta",
    description: "Metas e prazos",
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
  { value: "cartao-credito", label: "Cartão" },
  { value: "dividas", label: "Dívidas" },
  { value: "lazer", label: "Lazer" },
  { value: "nao-sei", label: "Não sei ainda" },
]

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
      return "Cadastre cada entrada — o mês se ajusta."
    case "renda-variavel":
      return "Cadastre entradas para ajustar seus limites."
    case "ocasional":
      return "Cadastre o que entrar. Sem renda fixa."
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
        welcomeTitle: flexibleIncome ? "Acompanhe entradas e gastos" : "Organize seus gastos",
        welcomeHint: weightLabel
          ? `Registre ${weightLabel.toLowerCase()} e veja pra onde vai.`
          : "Registre e veja por categoria.",
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
        welcomeTitle: "Controle do mês",
        welcomeHint: weightLabel
          ? `Veja quanto ainda pode gastar em ${weightLabel.toLowerCase()}.`
          : "Veja quanto ainda pode gastar.",
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
        welcomeTitle: "Sair das dívidas",
        welcomeHint: flexibleIncome
          ? "Acompanhe parcelas e cartão conforme o dinheiro entrar."
          : "Veja o que já tem destino este mês.",
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
        welcomeTitle: "Guardar dinheiro",
        welcomeHint:
          incomeType === "sem-renda" || incomeType === "ocasional"
            ? "Guarde o que der — mesmo pouco conta."
            : "Separe o que sobra todo mês.",
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
        welcomeTitle: "Suas metas",
        welcomeHint:
          incomeType === "ocasional" || incomeType === "sem-renda"
            ? "Comece com metas pequenas."
            : "Veja quanto guardar por mês.",
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