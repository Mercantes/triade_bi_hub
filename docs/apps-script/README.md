# Backup do Apps Script (BI Triade - PipeRun)

Cópia versionada do código que vive no projeto **Google Apps Script** "BI Triade - PipeRun"
(vinculado à planilha do Google Sheets que serve de banco). Este código **não roda** a
partir do repositório — é backup/referência. A fonte de verdade é o Apps Script no Google.

## Arquivos
- **`Codigo.gs`** — Web App (`doGet`/`doPost`). Calcula os KPIs por funil e serve o JSON
  consumido pelo dashboard (via proxy `/api/bi` e `/api/metas`). Também grava as metas
  editadas no app (aba `metas`).
- **`Sync.gs`** — Sincronização PipeRun → Google Sheets. Crons diários às 6h:
  - `syncDiarioA`: dimensões + deals
  - `syncDiarioB`: histórico de etapas + atividades abertas + atividades realizadas

## Abas do Sheets (banco)
`deals`, `dim_stages`, `dim_users`, `dim_loss_reasons`, `dim_origins`
(de-para `origin_id → nome`, via `/origins`), `stage_history`,
`activities` (abertas, status 0), `activities_done` (realizadas, status 2),
`metas` (metas por vendedor/mês), `_control` (last_sync incremental).

## Origens (Conversão por Origem)
- `syncDimensions` popula `dim_origins` a partir do endpoint **`GET /origins`** do PipeRun
  (ex.: ProspectAI, Prospecção Ativa, Consultantes). O `doGet` usa esse de-para no bloco
  `conversao_origem` (leads criados → vendas → taxa) de cada funil.
- Se a `dim_origins` ficar vazia, o dashboard mostra "Origem {id}" no lugar do nome — rode
  `syncDimensions` para repopular.

## Como atualizar este backup
Sempre que mudar o Apps Script no Google, atualize o arquivo correspondente aqui e commite,
para manter o backup em dia.

## Notas de configuração
- Propriedades do script: `PIPERUN_TOKEN`, `PIPELINES=100776,54068`.
- Publicar: **Implantar → Gerenciar implantações → Editar → Nova versão** (mantém a mesma URL).
- O `_control!B1` (last_sync) é gravado como **texto** para o Sheets não convertê-lo em Data
  (isso já causou erro 422 no `/deals` — ver `readControl_`/`writeControl_`).

> As funções `probe*` usadas durante a investigação eram temporárias e não fazem parte
> deste backup; podem ser removidas do Apps Script.
