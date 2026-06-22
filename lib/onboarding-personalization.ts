import type {
  BudgetWeight,
  CategoryId,
  ExtraIncomeFrequency,
  FinancialObjective,
  FinancialProfile,
  Goal,
  SpendingLimit,
} from "./types"

export type OnboardingIncomeData = {
  monthlySalary: number
  salaryDay: number
  expectedExtraIncome: number
  extraIncomeFrequency: ExtraIncomeFrequency
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

export const FINANCIAL_MOMENT_OPTIONS: Array<{
  value: FinancialObjective
  label: string
  description: string
}> = [
  {
    value: "entender-gastos",
    label: "Entender para onde meu dinheiro vai",
    description: "Organização e visão por categoria",
  },
  {
    value: "controlar-gastos",
    label: "Parar de gastar sem perceber",
    description: "Limites e controle do mês",
  },
  {
    value: "sair-dividas",
    label: "Sair das dívidas",
    description: "Foco em parcelas e comprometimento",
  },
  {
    value: "reserva-emergencia",
    label: "Guardar dinheiro",
    description: "Reserva e separação do disponível",
  },
  {
    value: "planejar-metas",
    label: "Comprar algo ou alcançar uma meta",
    description: "Metas e quanto guardar por mês",
  },
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
  { value: "nao-sei", label: "Não sei ainda" },
]

export const EXTRA_INCOME_OPTIONS: Array<{
  value: Extract<ExtraIncomeFrequency, "none" | "monthly">
  label: string
}> = [
  { value: "none", label: "Não tenho" },
  { value: "monthly", label: "Todo mês" },
]

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

export function suggestMonthlyReserve(monthlySalary: number, objective: FinancialObjective): number {
  if (objective !== "reserva-emergencia") return 0
  return roundMoney(monthlySalary * 0.1)
}

export function buildInitialLimits(
  monthlySalary: number,
  objective: FinancialObjective,
  budgetWeight: BudgetWeight,
): SpendingLimit[] {
  if (monthlySalary <= 0) return []

  const limits: SpendingLimit[] = []
  const seen = new Set<string>()

  function pushLimit(category: CategoryId, share: number) {
    const key = category
    if (seen.has(key)) return
    seen.add(key)
    limits.push({
      id: `lim_onboard_${category}`,
      category,
      amount: roundMoney(monthlySalary * share),
      alertPercent: 80,
    })
  }

  if (budgetWeight !== "nao-sei") {
    pushLimit(budgetWeight, BUDGET_WEIGHT_LIMIT_SHARE[budgetWeight])
  }

  if (objective === "controlar-gastos") {
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
  const monthlyReserve = suggestMonthlyReserve(income.monthlySalary, objective)

  const profile: FinancialProfile = {
    ...currentProfile,
    monthlySalary: income.monthlySalary,
    salaryDay: income.salaryDay,
    expectedExtraIncome: income.expectedExtraIncome,
    extraIncomeFrequency: income.extraIncomeFrequency,
    budgetWeight,
    objective,
    monthlyReserve,
    configured: true,
    currency: "BRL",
    salaryHistory: [
      {
        effectiveFrom: new Date().toISOString().slice(0, 7),
        monthlySalary: income.monthlySalary,
        salaryDay: income.salaryDay,
        expectedExtraIncome: income.expectedExtraIncome,
        monthlyReserve,
        objective,
      },
    ],
  }

  const limits = buildInitialLimits(income.monthlySalary, objective, budgetWeight)
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
  pennyAnalysisPrompt: string
}

export function getDashboardFocus(objective: FinancialObjective, budgetWeight?: BudgetWeight): DashboardFocus {
  const weightLabel =
    budgetWeight && budgetWeight !== "nao-sei"
      ? BUDGET_WEIGHT_OPTIONS.find((item) => item.value === budgetWeight)?.label
      : null

  switch (objective) {
    case "entender-gastos":
      return {
        welcomeTitle: "Vamos organizar seus gastos",
        welcomeHint: weightLabel
          ? `Comece registrando o que gasta em ${weightLabel.toLowerCase()} e veja para onde vai seu dinheiro.`
          : "Registre seus gastos e acompanhe por categoria — sem planilha.",
        primaryCta: { label: "Registrar gasto", href: "/transactions" },
        secondaryCta: { label: "Ver relatórios", href: "/reports" },
        showGoalsFirst: false,
        showLimitsProminent: false,
        showCommittedPercent: false,
        showReserveSplit: false,
        showCategoryReports: true,
        pennyAnalysisPrompt: "Entender meus gastos",
      }
    case "controlar-gastos":
      return {
        welcomeTitle: "Controle do mês ativado",
        welcomeHint: weightLabel
          ? `Acompanhe quanto ainda pode gastar, principalmente em ${weightLabel.toLowerCase()}.`
          : "Veja quanto ainda pode gastar e receba alertas antes de estourar o limite.",
        primaryCta: { label: "Ver limites", href: "/limits" },
        secondaryCta: { label: "Comparar com mês anterior", href: "/reports" },
        showGoalsFirst: false,
        showLimitsProminent: true,
        showCommittedPercent: false,
        showReserveSplit: false,
        showCategoryReports: false,
        pennyAnalysisPrompt: "Melhorar meu planejamento",
      }
    case "sair-dividas":
      return {
        welcomeTitle: "Foco em sair das dívidas",
        welcomeHint: "Acompanhe quanto da renda já está comprometida e controle parcelas e cartão.",
        primaryCta: { label: "Cadastrar dívida", href: "/profile" },
        secondaryCta: { label: "Ver comprometimento", href: "/cashflow" },
        showGoalsFirst: false,
        showLimitsProminent: true,
        showCommittedPercent: true,
        showReserveSplit: false,
        showCategoryReports: false,
        pennyAnalysisPrompt: "Ver análise da Penny",
      }
    case "reserva-emergencia":
      return {
        welcomeTitle: "Hora de guardar dinheiro",
        welcomeHint: "Separe o disponível do reservado e acompanhe seu progresso mensal.",
        primaryCta: { label: "Ver investimentos", href: "/investments" },
        secondaryCta: { label: "Ajustar reserva", href: "/profile" },
        showGoalsFirst: false,
        showLimitsProminent: false,
        showCommittedPercent: false,
        showReserveSplit: true,
        showCategoryReports: false,
        pennyAnalysisPrompt: "Melhorar meu planejamento",
      }
    case "planejar-metas":
      return {
        welcomeTitle: "Suas metas em primeiro lugar",
        welcomeHint: "Veja quanto guardar por mês e ajuste prazo ou valor quando precisar.",
        primaryCta: { label: "Ver metas", href: "/goals" },
        secondaryCta: { label: "Criar nova meta", href: "/goals" },
        showGoalsFirst: true,
        showLimitsProminent: false,
        showCommittedPercent: false,
        showReserveSplit: false,
        showCategoryReports: false,
        pennyAnalysisPrompt: "Ver análise da Penny",
      }
    default:
      return {
        welcomeTitle: "Seu caminho financeiro começou",
        welcomeHint: "Use o app no dia a dia — a Penny aprende com seus hábitos.",
        primaryCta: { label: "Registrar gasto", href: "/transactions" },
        showGoalsFirst: false,
        showLimitsProminent: false,
        showCommittedPercent: false,
        showReserveSplit: false,
        showCategoryReports: false,
        pennyAnalysisPrompt: "Ver análise da Penny",
      }
  }
}