import { ROUTES } from "../../routes"
import { isShortGreetingMessage } from "../../penny"
import type { PennyKnowledgeSource } from "../types"

const APP_AREAS = [
  {
    route: ROUTES.dashboard,
    name: "Início",
    capabilities: [
      "quanto pode gastar",
      "entradas, gastos e % da renda com destino",
      "sobra prevista e gráfico dos últimos meses",
      "alertas e dicas",
    ],
  },
  {
    route: ROUTES.transactions,
    name: "Lançamentos",
    capabilities: [
      "listar receitas e despesas",
      "importar extrato em PDF",
      "criar lançamento manual",
      "confirmar e categorizar pendentes",
      "filtrar e buscar",
    ],
  },
  {
    route: ROUTES.cashflow,
    name: "Fluxo",
    capabilities: [
      "entrou, saiu e previsão do mês",
      "janelas de 3, 6 ou 12 meses",
      "maior entrada e maior despesa",
    ],
  },
  {
    route: ROUTES.goals,
    name: "Metas",
    capabilities: [
      "metas com valor, prazo e progresso",
      "metas em risco",
      "criar meta nova",
    ],
  },
  {
    route: ROUTES.limits,
    name: "Limites",
    capabilities: [
      "teto mensal por categoria",
      "gasto e % usado",
      "categorias estouradas",
      "criar e editar limite",
    ],
  },
  {
    route: ROUTES.investments,
    name: "Investimentos",
    capabilities: [
      "o que guardou e investiu",
      "total guardado, investido e rendimento",
      "cadastrar ativo manualmente",
    ],
  },
  {
    route: ROUTES.reports,
    name: "Relatórios",
    capabilities: [
      "resumo do período",
      "gastos por categoria",
      "comparativo mês a mês",
    ],
  },
  {
    route: ROUTES.categories,
    name: "Categorias",
    capabilities: [
      "menu da conta, no avatar",
      "categorias padrão e personalizadas",
    ],
  },
  {
    route: ROUTES.assistant,
    name: "Penny",
    capabilities: [
      "responder com seus dados",
      "orientar sobre o app",
      "organizar lançamentos com confirmação",
      "criar lançamento com autorização em Minha conta",
    ],
  },
]

export const appCapabilitiesSource: PennyKnowledgeSource = {
  id: "app-capabilities",
  title: "Funcionalidades do PoupaByte",
  description: "Telas e ações disponíveis no app.",
  topics: ["app"],
  availableInformation: ["rotas", "nomes das áreas", "ações disponíveis", "limitações"],
  examples: ["Como importar um extrato?", "Onde vejo minhas metas?", "O app compra investimentos?"],
  sourceOfTruth: "rotas e componentes da aplicação",
  shouldQuery: (analysis) =>
    !isShortGreetingMessage(analysis.question) &&
    (analysis.appHelp || (analysis.topics.has("app") && analysis.topics.size === 1)),
  query: () => ({
    reason: "A pergunta pede orientação sobre o app.",
    data: {
      areas: APP_AREAS,
      statementImport: {
        acceptedFormat: "PDF bancário de até 10 MB",
        nativeParsers: ["Banco Inter", "Bradesco"],
        conditionalParsers: ["Itaú", "Nubank", "outros bancos, quando o endpoint externo estiver configurado"],
        workflow: [
          "selecionar PDF",
          "extrair lançamentos",
          "sugerir categorias e duplicatas",
          "revisar",
          "confirmar importação",
        ],
        protectedPdf: "pode pedir a senha do arquivo",
        scannedPdf: "não suportado",
      },
      incomeEditing: {
        fields: ["renda mensal", "dia de recebimento", "entradas extras", "reserva mensal", "objetivo principal"],
        scopes: ["só este mês", "a partir do próximo", "recalcular meses anteriores"],
        impact: "Início, Fluxo, Limites, Metas e Relatórios recalculam automaticamente",
      },
      operatingLimits: [
        "Pode categorizar, recategorizar e confirmar lançamentos pendentes — com confirmação sua.",
        "Não cria, edita ou exclui metas, limites ou investimentos, e não move dinheiro.",
        "Investimentos são informativos — sem ordens de compra ou venda.",
        "Sem sincronização bancária automática nem Open Finance.",
      ],
    },
  }),
}