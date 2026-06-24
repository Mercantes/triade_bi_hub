# BI Tríade

Dashboard de BI comercial (single-page, tema dark) construído com **Next.js
(App Router)** + **TypeScript** + **Tailwind CSS v4** + **Recharts**.

Consome um único endpoint do Google Apps Script e exibe dois funis —
**Vendas** e **Pré-Vendas** — alternados por um toggle no header.

## Como rodar

```bash
npm install
npm run dev
```

Acesse http://localhost:3000.

## Fonte de dados

Os dados vêm de um único endpoint GET (Apps Script), consumido via um
**proxy server-side** (`/api/bi`) para evitar CORS. A URL padrão está em
[`src/lib/config.ts`](src/lib/config.ts) e pode ser sobrescrita pela variável
de ambiente `BI_ENDPOINT` (ver `.env.example`).

O proxy repassa os parâmetros `from` e `to` (YYYY-MM-DD) para o endpoint.

## Funcionalidades

- **Toggle de funil** no header: Pré-Vendas | Vendas (sem refetch — ambos vêm na
  mesma resposta).
- **Seletor de período** (de/até) com atalhos: Mês atual, Últimos 3 meses,
  Últimos 12 meses. Trocar o período refaz o fetch.
- **Estados** de carregando e de erro amigável (com "tentar novamente").
- Formatação pt-BR (R$ 1.234,56; percentuais com 1 casa; "—" onde 0/null não
  faz sentido).
- Cores por threshold (comparecimento, atingimento de meta, atividades
  atrasadas).

### Painel Pré-Vendas
KPIs (leads abertos/para abrir, reuniões marcadas/realizadas, no-show,
comparecimento, atividades atrasadas), funil por etapa, ranking de SDRs por
reuniões, ranking com meta (qtd), atividades atrasadas por SDR e motivos de
perda (donut).

### Painel Vendas
KPIs (faturamento, vendas, ticket médio, taxa de fechamento, ciclo médio,
reuniões realizadas, valor em aberto), funil por etapa (com R$), ganhos × perdas
+ donut de motivos, ranking de vendedores com meta (R$) e reuniões realizadas
por vendedor.

## Estrutura

```
src/
├── app/
│   ├── api/bi/route.ts   # Proxy server-side do Apps Script
│   ├── layout.tsx        # Layout raiz (pt-BR, tema dark)
│   └── page.tsx          # Renderiza <Dashboard/>
├── components/
│   ├── dashboard.tsx     # Orquestra header, toggle, período e fetch
│   ├── prevendas-panel.tsx
│   ├── vendas-panel.tsx
│   ├── funnel-bars.tsx
│   ├── motivos-donut.tsx
│   └── ui.tsx            # Card, StatCard, ProgressBar, etc.
└── lib/
    ├── api.ts            # fetch client (/api/bi)
    ├── config.ts         # URL do endpoint
    ├── types.ts          # Tipos do payload
    ├── dates.ts          # Períodos e atalhos
    ├── colors.ts         # Cores por threshold
    └── format.ts         # Formatação pt-BR
```

## Scripts

- `npm run dev` — desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — lint
