# PoupaByte

Aplicativo de finanças pessoais com planejamento mensal, orçamentos, metas, patrimônio, análises e assistente virtual **P.E.N.N.Y.**

Stack principal: **Next.js 16**, **React 19**, **TypeScript**, **Tailwind CSS** e **Capacitor** (Android).

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
- npm (incluído com o Node.js)

Para build Android (opcional):

- [Android Studio](https://developer.android.com/studio)
- JDK 17+

## Instalação

```bash
git clone <url-do-repositorio>
cd PoupaByte
npm install
```

## Variáveis de ambiente

Copie o arquivo de exemplo e ajuste os valores:

```bash
cp .env.example .env
```

### Mínimo para rodar localmente

| Variável | Descrição |
|----------|-----------|
| `OPENROUTER_API_KEY` | Chave da API OpenRouter (necessária para a P.E.N.N.Y.) |
| `NEXT_PUBLIC_APP_URL` | URL base do app (ex.: `http://localhost:3000`) |

As demais variáveis em `.env.example` são opcionais (provedores alternativos de IA, importação de extrato, build mobile).

## Rodar em desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

O app usa **localStorage** no navegador para autenticação e dados — não é necessário banco de dados externo. Contas novas começam **sem dados pré-preenchidos**.

## Deploy na Vercel

1. Importe o repositório na [Vercel](https://vercel.com).
2. Framework preset: **Next.js** (detectado automaticamente).
3. Configure as variáveis de ambiente do `.env.example` no painel da Vercel:
   - `OPENROUTER_API_KEY` (obrigatória para a P.E.N.N.Y.)
   - `NEXT_PUBLIC_APP_URL` = URL de produção (ex.: `https://seu-app.vercel.app`)
4. Faça o deploy.

As rotas de API (`/api/assistant`, `/api/import-statement`) rodam em **Node.js** com timeout estendido (ver `vercel.json`). A região padrão do deploy é **São Paulo (`gru1`)**.

```bash
npx vercel
# ou
npx vercel --prod
```

## Build e produção (web)

```bash
npm run build
npm start
```

Por padrão, o servidor sobe em [http://localhost:3000](http://localhost:3000).

## Scripts úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (Turbopack) |
| `npm run build` | Build de produção |
| `npm start` | Servidor de produção |
| `npm run lint` | ESLint |
| `npm test` | Testes (Vitest) |
| `npm run build:android` | Export estático do Next para Capacitor (`out/`) |
| `npm run android:sync` | Build Android + sincroniza com o projeto nativo |
| `npm run android:open` | Abre o projeto no Android Studio |

## Android (Capacitor)

1. Configure o ambiente Android (SDK, emulador ou dispositivo físico).
2. Gere o export estático e sincronize:

```bash
npm run android:sync
```

3. Abra no Android Studio:

```bash
npm run android:open
```

4. Rode o app pelo Android Studio (Run ▶).

Para APK apontando para um backend remoto, defina `NEXT_PUBLIC_API_BASE_URL` com a URL HTTPS do servidor que expõe `/api/assistant` e `/api/import-statement`.

## Estrutura do projeto

```
app/              Rotas e páginas (Next.js App Router)
components/       Componentes de UI e layout
lib/              Lógica de negócio, store, IA, rotas
public/           Assets estáticos
android/          Projeto nativo Capacitor (Android)
scripts/          Scripts de build mobile
tests/            Testes automatizados
```

## Rotas principais

| Rota | Tela |
|------|------|
| `/dashboard` | Visão geral |
| `/transactions` | Movimentações |
| `/cashflow` | Planejamento |
| `/goals` | Objetivos |
| `/limits` | Orçamentos |
| `/investments` | Patrimônio |
| `/reports` | Análises |
| `/assistant` | P.E.N.N.Y. |
| `/categories` | Categorias |
| `/profile` | Minha conta |

Rotas antigas em português (ex.: `/visao-geral`, `/penny`) redirecionam automaticamente para as rotas em inglês.

## Solução de problemas

**P.E.N.N.Y. não responde** — verifique se `OPENROUTER_API_KEY` está definida em `.env` e reinicie o servidor.

**Erro após alterar `.env`** — pare o `npm run dev` e inicie novamente.

**Build Android falha** — confirme Android Studio, SDK e `android/local.properties` com o caminho do SDK.

## Licença

Projeto privado (`"private": true` no `package.json`).