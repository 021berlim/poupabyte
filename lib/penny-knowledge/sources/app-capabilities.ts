import { ROUTES } from "../../routes"
import { isShortGreetingMessage } from "../../penny"
import type { PennyKnowledgeSource } from "../types"

const APP_AREAS = [
  {
    route: ROUTES.dashboard,
    name: "Visão Geral",
    capabilities: [
      "disponível para gastar (renda do mês menos despesas confirmadas e comprometidas)",
      "renda cadastrada, entradas, despesas e % de renda comprometida",
      "economia prevista e gráfico dos últimos meses",
      "painel o que precisa de atenção (ex.: lançamentos sem confirmação)",
      "dicas rápidas",
    ],
  },
  {
    route: ROUTES.transactions,
    name: "Movimentações",
    capabilities: [
      "listar receitas e despesas",
      "importar extrato em PDF",
      "criar transação manual",
      "confirmar ou categorizar lançamentos pendentes",
      "filtrar e buscar",
      "lançamentos importados chegam sem categoria até revisão",
    ],
  },
  {
    route: ROUTES.cashflow,
    name: "Planejamento",
    capabilities: [
      "comparar realizado vs previsto em janelas de 3, 6 ou 12 meses",
      "projeção de fim do mês com alerta de risco de déficit",
      "maior receita e maior despesa do período",
    ],
  },
  {
    route: ROUTES.goals,
    name: "Objetivos",
    capabilities: [
      "metas financeiras conectadas à renda mensal",
      "valor total guardado e progresso geral",
      "metas com risco de atraso",
      "criar meta nova",
    ],
  },
  {
    route: ROUTES.limits,
    name: "Orçamentos",
    capabilities: [
      "orçamento mensal por categoria",
      "quanto já foi gasto e % de uso do orçamento",
      "categorias estouradas",
      "criar e editar orçamento",
    ],
  },
  {
    route: ROUTES.investments,
    name: "Patrimônio",
    capabilities: [
      "reservas e investimentos cadastrados manualmente",
      "total guardado, total investido e rendimento acumulado",
      "cadastrar ativo",
    ],
  },
  {
    route: ROUTES.reports,
    name: "Análises",
    capabilities: [
      "receitas, despesas e resultado (receitas − despesas)",
      "% de renda comprometida",
      "despesas por categoria",
      "comparativo mensal de receitas vs despesas",
    ],
  },
  {
    route: ROUTES.categories,
    name: "Categorias",
    capabilities: [
      "acessível pelo menu da conta, no avatar do usuário",
      "categorias padrão do sistema",
      "categorias personalizadas para classificar lançamentos",
    ],
  },
  {
    route: ROUTES.assistant,
    name: "P.E.N.N.Y.",
    capabilities: [
      "interpretar dados financeiros do usuário",
      "orientar sobre funcionalidades do PoupaByte",
      "organizar lançamentos existentes com confirmação explícita",
    ],
  },
]

export const appCapabilitiesSource: PennyKnowledgeSource = {
  id: "app-capabilities",
  title: "Funcionalidades do PoupaByte",
  description: "Catálogo estático das áreas e ações realmente disponíveis no aplicativo.",
  topics: ["app"],
  availableInformation: ["rotas", "nomes das áreas", "ações disponíveis", "limitações operacionais"],
  examples: ["Como importar um extrato?", "Onde vejo meus objetivos?", "O app compra investimentos?"],
  sourceOfTruth: "rotas e componentes da aplicação",
  shouldQuery: (analysis) =>
    !isShortGreetingMessage(analysis.question) &&
    (analysis.appHelp || (analysis.topics.has("app") && analysis.topics.size === 1)),
  query: () => ({
    reason: "A pergunta solicita orientação sobre o funcionamento do aplicativo.",
    data: {
      areas: APP_AREAS,
      statementImport: {
        acceptedFormat: "PDF bancário de até 10 MB",
        nativeParsers: ["Banco Inter", "Bradesco"],
        conditionalParsers: ["Itaú", "Nubank", "outros bancos, quando o endpoint externo de interpretação estiver configurado"],
        workflow: [
          "selecionar arquivo PDF",
          "processar e extrair movimentações",
          "sugerir categorias e detectar duplicatas",
          "revisar itens",
          "confirmar importação",
          "recalcular visão geral, planejamento, orçamentos e análises",
        ],
        protectedPdf: "pode solicitar a senha do próprio arquivo",
        scannedPdf: "não suportado",
      },
      incomeEditing: {
        fields: ["salário mensal líquido", "dia de recebimento", "rendas extras previstas", "reserva mensal", "objetivo principal"],
        scopes: ["somente mês atual", "a partir do próximo mês", "recalcular meses anteriores"],
        impact: "dashboard, planejamento, orçamentos, objetivos, análises e alertas recalculam automaticamente",
      },
      operatingLimits: [
        "Escrita assistida: pode categorizar, recategorizar e confirmar lançamentos pendentes com confirmação explícita do usuário.",
        "Não cria, edita ou exclui metas, orçamentos ou investimentos, e não move dinheiro.",
        "O acompanhamento de patrimônio é informativo e não envia ordens de compra ou venda.",
        "Não existe sincronização bancária automática nem Open Finance.",
      ],
    },
  }),
}