# Integração de Metas — Apps Script (CRUD por vendedor na aba `metas`)

O botão **"Editar metas"** edita as metas **por vendedor / por funil / por mês**
direto na aba **`metas`** (a fonte que alimenta os cálculos do dashboard).

Contrato consumido pelo frontend via o proxy `/api/metas`:

- `GET /api/metas` → lê `GET {exec}?action=usuarios` → `{ ok, usuarios }`
  (lista de vendedores para o seletor "adicionar vendedor")
- `POST /api/metas` → faz `POST {exec}` com
  `{ action: "save_metas_rows", pipeline_id, mes: "YYYY-MM", rows: [...] }`
  → substitui as linhas daquele funil+mês na aba `metas`.

Cada `row` tem: `owner_id` + `meta_leads, meta_reun_marcadas, meta_reun_realizadas,
meta_vendas, meta_ticket, meta_faturamento, meta_taxa_fechamento`.

> Substituição de escopo = CRUD completo: **criar** (incluir linha), **editar**
> (alterar valores), **excluir** (omitir a linha). Linhas de outros funis/meses
> são preservadas.

## O que adicionar no `Código.gs`

### 1. No `doGet`, logo após `function doGet(e) {`
```javascript
  if (e && e.parameter && e.parameter.action === 'usuarios') {
    return jsonOut_({ ok: true, usuarios: readSheet_('dim_users').map(function (u) {
      return { owner_id: Number(u.user_id), nome: u.user_name || ('Usuario ' + u.user_id) };
    }) });
  }
```

### 2. No FINAL do arquivo (helpers + doPost)
```javascript
function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

var METAS_HEADERS = ['owner_id','pipeline_id','mes','meta_leads','meta_reun_marcadas',
  'meta_reun_realizadas','meta_vendas','meta_ticket','meta_faturamento','meta_taxa_fechamento'];

// substitui todas as linhas da aba `metas` daquele funil+mes pelas linhas recebidas
function saveMetasRows_(pipelineId, mes, rows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('metas');
  if (!sh) sh = ss.insertSheet('metas');
  var data = sh.getDataRange().getValues();
  var temHeader = data.length && String(data[0][0]).trim() === 'owner_id';
  var existentes = temHeader ? data.slice(1) : data;
  var manter = existentes.filter(function (r) {
    return !(String(r[1]) === String(pipelineId) && normMes_(r[2]) === String(mes));
  }).map(function (r) {
    var x = r.slice(0, METAS_HEADERS.length);
    while (x.length < METAS_HEADERS.length) x.push('');
    return x;
  });
  var novas = (rows || []).map(function (o) {
    return [ Number(o.owner_id), Number(pipelineId), mes,
      num_(o.meta_leads), num_(o.meta_reun_marcadas), num_(o.meta_reun_realizadas),
      num_(o.meta_vendas), num_(o.meta_ticket), num_(o.meta_faturamento), num_(o.meta_taxa_fechamento) ];
  });
  var out = [METAS_HEADERS].concat(manter).concat(novas);
  sh.clearContents();
  sh.getRange(1, 3, sh.getMaxRows(), 1).setNumberFormat('@'); // coluna mes como texto
  sh.getRange(1, 1, out.length, METAS_HEADERS.length).setValues(out);
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'save_metas_rows') {
      saveMetasRows_(body.pipeline_id, body.mes, body.rows || []);
      return jsonOut_({ ok: true });
    }
    return jsonOut_({ ok: false, error: 'acao desconhecida' });
  } catch (err) { return jsonOut_({ ok: false, error: String(err) }); }
}
```

> A versão antiga (override em `metas_override`) foi descontinuada — pode
> apagar aquela aba se ela tiver sido criada.

## Republicar (mantendo a URL)
**Implantar → Gerenciar implantações → Editar (lápis) → Versão: Nova versão → Implantar.**
