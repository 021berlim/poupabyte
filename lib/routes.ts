export const ROUTES = {
  dashboard: "/dashboard",
  transactions: "/transactions",
  cashflow: "/cashflow",
  goals: "/goals",
  limits: "/limits",
  investments: "/investments",
  reports: "/reports",
  assistant: "/assistant",
  categories: "/categories",
  profile: "/profile",
  profileSecurity: "/profile/security",
  profilePreferences: "/profile/preferences",
  profilePrivacy: "/profile/privacy",
  login: "/login",
  signup: "/signup",
} as const

export const APP_HOME = ROUTES.dashboard

export type Screen =
  | typeof ROUTES.dashboard
  | typeof ROUTES.transactions
  | typeof ROUTES.cashflow
  | typeof ROUTES.investments
  | typeof ROUTES.goals
  | typeof ROUTES.limits
  | typeof ROUTES.categories
  | typeof ROUTES.reports
  | typeof ROUTES.assistant
  | typeof ROUTES.profile

/** Rotas antigas em português → slugs atuais em inglês */
export const LEGACY_ROUTE_REDIRECTS: Record<string, string> = {
  "/visao-geral": ROUTES.dashboard,
  "/movimentacoes": ROUTES.transactions,
  "/planejamento": ROUTES.cashflow,
  "/objetivos": ROUTES.goals,
  "/orcamentos": ROUTES.limits,
  "/patrimonio": ROUTES.investments,
  "/analises": ROUTES.reports,
  "/penny": ROUTES.assistant,
  "/categorias": ROUTES.categories,
  "/perfil": ROUTES.profile,
  "/perfil/seguranca": ROUTES.profileSecurity,
  "/perfil/preferencias": ROUTES.profilePreferences,
  "/perfil/privacidade": ROUTES.profilePrivacy,
}

export function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`)
}