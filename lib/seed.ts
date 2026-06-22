import type {
  AppState,
  CreditCard,
  FinancialProfile,
  Goal,
  Installment,
  Investment,
  SpendingLimit,
  Subscription,
  Transaction,
} from "./types"

function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function dateAt(monthsAgo: number, day: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - monthsAgo)
  const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, maxDay))
  d.setHours(10, 0, 0, 0)
  return d.toISOString()
}

function futureDate(monthsAhead: number, day = 15): string {
  const d = new Date()
  d.setMonth(d.getMonth() + monthsAhead)
  d.setDate(day)
  return d.toISOString()
}

/** Perfil inicial vazio — conta nova sem dados pré-preenchidos */
export const EMPTY_FINANCIAL_PROFILE: FinancialProfile = {
  monthlySalary: 0,
  salaryDay: 1,
  objective: "entender-gastos",
  currency: "BRL",
  configured: false,
  expectedExtraIncome: 0,
  monthlyReserve: 0,
  salaryHistory: [],
}

/** Perfil da demonstração (apenas para "Restaurar demo") */
export const DEFAULT_FINANCIAL_PROFILE: FinancialProfile = {
  monthlySalary: 7200,
  salaryDay: 5,
  objective: "organizar-salario",
  currency: "BRL",
  configured: true,
  expectedExtraIncome: 0,
  monthlyReserve: 600,
  salaryHistory: [
    {
      effectiveFrom: "0000-01",
      monthlySalary: 7200,
      salaryDay: 5,
      expectedExtraIncome: 0,
      monthlyReserve: 600,
      objective: "organizar-salario",
    },
  ],
}

export function buildEmptyState(): Omit<AppState, "user"> {
  return {
    onboardingCompleted: false,
    financialProfile: EMPTY_FINANCIAL_PROFILE,
    transactions: [],
    goals: [],
    limits: [],
    subscriptions: [],
    installments: [],
    creditCards: [],
    investments: [],
    lastImport: null,
    notifications: [],
    userCategories: [],
    hiddenSystemCategories: [],
    categoryRules: [],
  }
}

function buildCreditCards(): CreditCard[] {
  return [
    { id: uid("card"), name: "Nubank Roxinho", closingDay: 3, dueDay: 10, active: true },
    { id: uid("card"), name: "Inter Gold", closingDay: 15, dueDay: 22, active: true },
  ]
}

function buildSubscriptions(): Subscription[] {
  return [
    { id: uid("sub"), name: "Netflix", amount: 39.9, category: "assinaturas", billingDay: 8, frequency: "monthly", active: true },
    { id: uid("sub"), name: "Spotify", amount: 27.9, category: "assinaturas", billingDay: 12, frequency: "monthly", active: true },
    { id: uid("sub"), name: "Internet", amount: 119.9, category: "moradia", billingDay: 10, frequency: "monthly", active: true },
    { id: uid("sub"), name: "Academia", amount: 110, category: "saude", billingDay: 1, frequency: "monthly", active: true },
  ]
}

function buildInstallments(cards: CreditCard[]): Installment[] {
  const mainCard = cards[0]?.id
  return [
    {
      id: uid("inst"),
      name: "Notebook",
      totalAmount: 2400,
      installmentCount: 12,
      currentInstallment: 4,
      monthlyAmount: 200,
      category: "compras",
      startDate: dateAt(3, 15),
      endDate: futureDate(8, 15),
      cardId: mainCard,
      status: "active",
    },
    {
      id: uid("inst"),
      name: "Celular",
      totalAmount: 1800,
      installmentCount: 10,
      currentInstallment: 2,
      monthlyAmount: 180,
      category: "compras",
      startDate: dateAt(1, 20),
      endDate: futureDate(8, 20),
      cardId: mainCard,
      status: "active",
    },
  ]
}

function buildTransactions(): Transaction[] {
  const tx: Transaction[] = []

  const incomes: Array<[number, number, string, Transaction["category"], number, Partial<Transaction>]> = [
    [0, 5, "Salário mensal", "salario", 7200, { isFixed: true, source: "fixed" }],
    [0, 20, "Freelance - landing page", "renda-extra", 1850, { source: "manual" }],
    [1, 5, "Salário mensal", "salario", 7200, { isFixed: true, source: "fixed" }],
    [2, 5, "Salário mensal", "salario", 7200, { isFixed: true, source: "fixed" }],
    [3, 5, "Salário mensal", "salario", 7200, { isFixed: true, source: "fixed" }],
  ]
  for (const [m, day, desc, cat, amount, meta] of incomes) {
    tx.push({ id: uid("tx"), type: "income", description: desc, amount, category: cat, date: dateAt(m, day), ...meta })
  }

  const expenses: Array<[number, number, string, Transaction["category"], number, Partial<Transaction>]> = [
    [0, 3, "Aluguel", "moradia", 1800, { isFixed: true, source: "fixed" }],
    [0, 4, "Mercado Extra", "alimentacao", 620, { source: "pdf-import" }],
    [0, 6, "Uber", "transporte", 28.5, { source: "pdf-import" }],
    [0, 8, "Combustível", "transporte", 280, { source: "manual" }],
    [0, 8, "Netflix", "assinaturas", 39.9, { isSubscription: true, isRecurring: true, source: "fixed" }],
    [0, 10, "Internet", "moradia", 119.9, { isFixed: true, isRecurring: true, source: "fixed" }],
    [0, 10, "Plano de saúde", "saude", 420, { isFixed: true, source: "fixed" }],
    [0, 12, "Spotify", "assinaturas", 27.9, { isSubscription: true, isRecurring: true, source: "fixed" }],
    [0, 15, "Curso online", "educacao", 89, { source: "manual" }],
    [0, 18, "Cinema", "lazer", 160, { source: "manual" }],
    [0, 20, "Aporte reserva de emergência", "reserva-emergencia", 600, { source: "manual" }],
    [0, 22, "Farmácia", "saude", 85, { source: "pdf-import" }],
    [1, 3, "Aluguel", "moradia", 1800, { isFixed: true, source: "fixed" }],
    [1, 6, "Supermercado", "alimentacao", 540, { source: "manual" }],
    [1, 9, "Uber e transporte", "transporte", 210, { source: "manual" }],
    [1, 14, "Farmácia", "saude", 130, { source: "manual" }],
    [2, 3, "Aluguel", "moradia", 1800, { isFixed: true, source: "fixed" }],
    [2, 7, "Supermercado", "alimentacao", 680, { source: "manual" }],
    [3, 3, "Aluguel", "moradia", 1750, { isFixed: true, source: "fixed" }],
    [3, 9, "Supermercado", "alimentacao", 590, { source: "manual" }],
    [3, 13, "Academia", "saude", 110, { isSubscription: true, source: "fixed" }],
  ]
  for (const [m, day, desc, cat, amount, meta] of expenses) {
    tx.push({ id: uid("tx"), type: "expense", description: desc, amount, category: cat, date: dateAt(m, day), ...meta })
  }

  return tx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

function buildGoals(): Goal[] {
  return [
    { id: uid("goal"), name: "Reserva de emergência", target: 20000, current: 12500, deadline: futureDate(8), color: "#22c55e" },
    { id: uid("goal"), name: "Viagem", target: 9000, current: 8400, deadline: futureDate(1, 10), color: "#3b82f6" },
    { id: uid("goal"), name: "Notebook", target: 6500, current: 4200, deadline: futureDate(3), color: "#c72c3b" },
  ]
}

function buildLimits(): SpendingLimit[] {
  return [
    { id: uid("lim"), category: "alimentacao", amount: 700, alertPercent: 70 },
    { id: uid("lim"), category: "transporte", amount: 350, alertPercent: 70 },
    { id: uid("lim"), category: "lazer", amount: 250, alertPercent: 70 },
    { id: uid("lim"), category: "moradia", amount: 2000, alertPercent: 70 },
    { id: uid("lim"), category: "assinaturas", amount: 200, alertPercent: 70 },
  ]
}

function buildInvestments(): Investment[] {
  const cdbId = uid("inv")
  const tesouroId = uid("inv")
  return [
    {
      id: cdbId,
      name: "CDB Liquidez Diária",
      type: "cdb",
      institution: "Corretora Poupa",
      investedAmount: 8500,
      currentValue: 8975,
      applicationDate: dateAt(4, 8),
      maturityDate: futureDate(18),
      expectedReturn: 8,
      notes: "Reserva com liquidez para oportunidades.",
      movements: [
        {
          id: uid("mov"),
          investmentId: cdbId,
          type: "contribution",
          amount: 1500,
          date: dateAt(1, 22),
          note: "Aporte mensal",
          previousValue: 7200,
          resultingValue: 8700,
        },
      ],
    },
    {
      id: tesouroId,
      name: "Tesouro IPCA 2029",
      type: "tesouro-direto",
      institution: "Tesouro Direto",
      investedAmount: 4800,
      currentValue: 5015,
      applicationDate: dateAt(6, 10),
      maturityDate: futureDate(36),
      expectedReturn: 7,
      notes: "Proteção contra inflação.",
      movements: [],
    },
  ]
}

export function buildSeedState(): Omit<AppState, "user"> {
  const creditCards = buildCreditCards()
  return {
    onboardingCompleted: true,
    financialProfile: DEFAULT_FINANCIAL_PROFILE,
    transactions: buildTransactions(),
    goals: buildGoals(),
    limits: buildLimits(),
    subscriptions: buildSubscriptions(),
    installments: buildInstallments(creditCards),
    creditCards,
    investments: buildInvestments(),
    lastImport: null,
    notifications: [],
    userCategories: [
      {
        id: "uc_mercado" as const,
        name: "Mercado",
        kind: "expense" as const,
        parentId: "alimentacao",
        active: true,
        isSubcategory: true,
        keywords: ["GUANABARA", "CARREFOUR", "MERCADO"],
      },
      {
        id: "uc_restaurante" as const,
        name: "Restaurante",
        kind: "expense" as const,
        parentId: "alimentacao",
        active: true,
        isSubcategory: true,
      },
      {
        id: "uc_streaming" as const,
        name: "Streaming",
        kind: "expense" as const,
        parentId: "assinaturas",
        active: true,
        isSubcategory: true,
        keywords: ["NETFLIX", "SPOTIFY", "DISNEY"],
      },
    ],
    hiddenSystemCategories: [],
    categoryRules: [],
  }
}

export const DEMO_USER = {
  name: "João David",
  email: "joao.david@poupabyte.com",
  createdAt: "2026-02-01T12:00:00.000Z",
}

export const generateId = uid