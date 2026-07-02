/**
 * BI Triade — Sincronizacao PipeRun -> Google Sheets (sem n8n)
 * BACKUP versionado do Apps Script (arquivo "Sync.gs").
 * Modelo de DOIS FUNIS: Pre-Vendas (100776) e Vendas (54068).
 *
 * Propriedades do script:
 *   PIPERUN_TOKEN = token
 *   PIPELINES     = 100776,54068
 *
 * Ordem inicial: setup() -> syncDimensions() -> syncDeals() -> installTriggers()
 * Crons diarios (6h): syncDiarioA (dimensoes+deals) e syncDiarioB (historico+atividades).
 */

var BASE = 'https://api.pipe.run/v1';
var CUTOFF_MONTHS = 24;       // 1a carga de deals: ultimos 24 meses
var CUTOFF_ATIV_MONTHS = 4;   // janela de atividades realizadas

function cfg_(key) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v) throw new Error('Falta a propriedade de script: ' + key);
  return v;
}
function getPipelines_() {
  return cfg_('PIPELINES').split(',').map(function (s) { return s.trim(); }).filter(String);
}
function cutoffDate_() {
  var d = new Date();
  d.setMonth(d.getMonth() - CUTOFF_MONTHS);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/* ====================== Nucleo HTTP + paginacao por PAGE ====================== */
function fetchAll_(path, params) {
  var token = cfg_('PIPERUN_TOKEN');
  var all = [];
  var page = 1;
  var totalPages = null;
  var complete = false;
  var start = Date.now();

  while (true) {
    var qs = Object.keys(params || {})
      .filter(function (k) { return params[k] !== null && params[k] !== undefined && params[k] !== ''; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); });
    qs.push('show=200');
    qs.push('page=' + page);

    var url = BASE + path + '?' + qs.join('&');
    var res = UrlFetchApp.fetch(url, { method: 'get', headers: { token: token }, muteHttpExceptions: true });
    var code = res.getResponseCode();

    if (code === 429) { Utilities.sleep(2500); continue; }
    if (code < 200 || code >= 300) {
      throw new Error('PipeRun ' + path + ' HTTP ' + code + ': ' + res.getContentText().slice(0, 300));
    }

    var body = JSON.parse(res.getContentText());
    var data = body.data || [];
    all = all.concat(data);

    var meta = body.meta || {};
    if (totalPages === null) totalPages = meta.total_pages || 1;

    if (data.length === 0 || page >= totalPages) { complete = true; break; }
    page++;
    if (Date.now() - start > 280000) { complete = false; break; }
    Utilities.sleep(120);
  }

  return { data: all, complete: complete };
}

/* ====================== HTTP com paginacao por CURSOR ====================== */
function fetchAllCursor_(path, params) {
  var token = cfg_('PIPERUN_TOKEN');
  var all = [];
  var cursor = '';
  var complete = false;
  var start = Date.now();

  while (true) {
    var qs = Object.keys(params || {})
      .filter(function (k) { return params[k] !== null && params[k] !== undefined && params[k] !== ''; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); });
    qs.push('show=200');
    if (cursor) qs.push('cursor=' + encodeURIComponent(cursor));

    var url = BASE + path + '?' + qs.join('&');
    var res = UrlFetchApp.fetch(url, { method: 'get', headers: { token: token }, muteHttpExceptions: true });
    var code = res.getResponseCode();

    if (code === 429) { Utilities.sleep(2500); continue; }
    if (code < 200 || code >= 300) {
      throw new Error('PipeRun ' + path + ' HTTP ' + code + ': ' + res.getContentText().slice(0, 300));
    }

    var body = JSON.parse(res.getContentText());
    var data = body.data || [];
    all = all.concat(data);
    cursor = (body.meta && body.meta.cursor) ? body.meta.cursor.next : null;

    if (!cursor || data.length === 0) { complete = true; break; }
    if (Date.now() - start > 280000) { complete = false; break; }
    Utilities.sleep(120);
  }
  return { data: all, complete: complete };
}

function readSheetObj_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) return [];
  var v = sh.getDataRange().getValues();
  if (v.length < 2) return [];
  var head = v[0];
  return v.slice(1).map(function (row) {
    var o = {};
    head.forEach(function (h, i) { o[String(h).trim()] = row[i]; });
    return o;
  });
}

function normNome_(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/* ====================== Sync de HISTORICO DE ETAPAS ====================== */
function syncStageHistory() {
  var cutoff = cutoffDate_() + ' 00:00:00';
  var stages = readSheetObj_('dim_stages');
  var stagePipe = {};
  stages.forEach(function (s) { stagePipe[String(s.stage_id)] = s.pipeline_id; });

  var alvos = stages.filter(function (s) {
    var n = normNome_(s.stage_name);
    return (n.indexOf('reuni') >= 0 && n.indexOf('agenda') >= 0)
        || n.indexOf('convert') >= 0
        || n.indexOf('no show') >= 0 || n.indexOf('noshow') >= 0
        || n.indexOf('proposta') >= 0
        || n.indexOf('negocia') >= 0
        || n.indexOf('fechamento') >= 0;
  });

  var headers = ['id','deal_id','pipeline_id','in_stage_id','out_stage_id','in_user_id','out_user_id','in_date','out_date'];
  var rows = [];
  var allComplete = true;

  alvos.forEach(function (t) {
    var r = fetchAll_('/stageHistories', { in_stage_id: t.stage_id, in_date_start: cutoff });
    if (!r.complete) allComplete = false;
    r.data.forEach(function (h) {
      rows.push([h.id, h.deal_id, stagePipe[String(h.in_stage_id)] || '', h.in_stage_id,
        h.out_stage_id, h.in_user_id, h.out_user_id, h.in_date, h.out_date]);
    });
    Logger.log('Etapa "' + t.stage_name + '" (' + t.stage_id + '): ' + r.data.length + ' entradas');
  });

  replaceSheet_('stage_history', headers, rows);
  Logger.log('Stage history: ' + rows.length + ' linhas' + (allComplete ? ' — COMPLETO.' : ' (PARCIAL — rode de novo).'));
}

/* ====================== Sync de ATIVIDADES ABERTAS (status 0) ====================== */
function syncActivities() {
  var dealsRows = readSheetObj_('deals');
  var dealPipe = {};
  dealsRows.forEach(function (d) { dealPipe[String(d.id)] = d.pipeline_id; });

  var r = fetchAll_('/activities', { status: 0 });
  var headers = ['id','deal_id','pipeline_id','owner_id','status','delivery_date','start_at','end_at','created_at'];
  var rows = r.data.map(function (a) {
    return [a.id, a.deal_id, dealPipe[String(a.deal_id)] || '', a.owner_id, a.status,
      a.delivery_date, a.start_at, a.end_at, a.created_at];
  });
  replaceSheet_('activities', headers, rows);
  Logger.log('Atividades abertas: ' + rows.length + (r.complete ? ' — COMPLETO.' : ' (PARCIAL).'));
}

/* ====================== Sync de ATIVIDADES REALIZADAS (status 2, janela) ====================== */
function syncActivitiesDone() {
  var d = new Date(); d.setMonth(d.getMonth() - CUTOFF_ATIV_MONTHS);
  var cut = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  var r = fetchAll_('/activities', { status: 2, delivery_date_start: cut });
  var headers = ['id', 'deal_id', 'owner_id', 'delivery_date'];
  var rows = r.data.map(function (a) { return [a.id, a.deal_id, a.owner_id, a.delivery_date]; });
  replaceSheet_('activities_done', headers, rows);
  Logger.log('Atividades realizadas: ' + rows.length + ' linhas (ultimos ' + CUTOFF_ATIV_MONTHS + ' meses)' + (r.complete ? ' — COMPLETO.' : ' (PARCIAL).'));
}

/* ====================== Sync de REUNIOES (atividade tipo "Reuniao de Vendas") ====================== */
// Tipo 126514 = "Reuniao de Vendas". Guarda abertas (agendadas) e concluidas, com data
// agendada (start_at) e de conclusao (delivery_date), para o funil de reunioes ser
// baseado em ATIVIDADE (igual ao relatorio do PipeRun) e nao em movimento de etapa.
var REUNIAO_TYPE_ID = '126514';

function syncReunioes() {
  var dealsRows = readSheetObj_('deals');
  var dealPipe = {};
  dealsRows.forEach(function (d) { dealPipe[String(d.id)] = d.pipeline_id; });

  var d = new Date(); d.setMonth(d.getMonth() - 13);
  var cut = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  // status: 0 = agendada (aberta), 2 = concluida (realizada), 4 = no-show
  var open = fetchAll_('/activities', { status: 0 }).data;
  var done = fetchAll_('/activities', { status: 2, delivery_date_start: cut }).data;
  var nosh = fetchAll_('/activities', { status: 4, created_at_start: cut }).data;
  var all = open.concat(done).concat(nosh).filter(function (a) { return String(a.activity_type_id) === REUNIAO_TYPE_ID; });

  var headers = ['id', 'deal_id', 'pipeline_id', 'owner_id', 'status', 'created_at', 'start_at', 'delivery_date'];
  var rows = all.map(function (a) {
    return [a.id, a.deal_id, dealPipe[String(a.deal_id)] || '', a.owner_id, a.status, a.created_at, a.start_at, a.delivery_date];
  });
  replaceSheet_('reunioes', headers, rows);
  Logger.log('Reunioes: ' + rows.length + ' linhas (status 0/2/4, com created_at).');
}

/* ====================== Sync de DEALS (page, 24 meses, upsert) ====================== */
function syncDeals() {
  var pipelines = getPipelines_();
  var lastSync = readControl_('last_sync');

  var headers = ['id','title','pipeline_id','stage_id','started_in_stage_id','owner_id','owner_name',
    'company_id','status','value','value_mrr','lost_reason_id','origin_id','temperature','probability',
    'lead_time','created_at','closed_at','updated_at','stage_changed_at','last_stage_updated_at',
    'probably_closed_at','deleted','freezed'];

  var rows = [];
  var allComplete = true;

  pipelines.forEach(function (pid) {
    var params = { pipeline_id: pid, with: 'users' };
    if (lastSync) params.updated_at_start = lastSync;        // incremental
    else params.created_at_start = cutoffDate_();            // 1a carga: ultimos 24 meses

    var r = fetchAll_('/deals', params);
    if (!r.complete) allComplete = false;

    r.data.forEach(function (d) {
      rows.push([
        d.id, d.title, d.pipeline_id, d.stage_id, d.started_in_stage_id, d.owner_id,
        (d.owner && d.owner.name) || '', d.company_id, d.status, d.value, d.value_mrr,
        d.lost_reason_id, d.origin_id, d.temperature, d.probability, d.lead_time,
        d.created_at, d.closed_at, d.updated_at, d.stage_changed_at, d.last_stage_updated_at,
        d.probably_closed_at, d.deleted, d.freezed
      ]);
    });
    Logger.log('Funil ' + pid + ': ' + r.data.length + ' deals' + (r.complete ? '' : ' (PARCIAL)'));
  });

  upsertById_('deals', headers, rows);

  if (allComplete) {
    writeControl_('last_sync', nowStr_());
    Logger.log('TOTAL: ' + rows.length + ' deals — carga COMPLETA.');
  } else {
    Logger.log('TOTAL ate agora: ' + rows.length + ' — carga PARCIAL (rode syncDeals de novo).');
  }
}

/* ====================== Sync de DIMENSOES ====================== */
function syncDimensions() {
  var pipelines = getPipelines_();

  var stages = [];
  pipelines.forEach(function (pid) { stages = stages.concat(fetchAll_('/stages', { pipeline_id: pid }).data); });
  replaceSheet_('dim_stages', ['stage_id','stage_name','pipeline_id','order'],
    stages.map(function (s) { return [s.id, s.name, s.pipeline_id, s.order]; }));

  var users = fetchAll_('/users', { active: 'all' }).data;
  replaceSheet_('dim_users', ['user_id','user_name','team'],
    users.map(function (u) { return [u.id, u.name, '']; }));

  var reasons = fetchAll_('/lostReasons', {}).data;
  replaceSheet_('dim_loss_reasons', ['loss_reason_id','loss_reason_name'],
    reasons.map(function (r) { return [r.id, r.name]; }));

  // Origens dos deals (de-para origin_id -> nome). Endpoint pode variar; protege com try/catch
  // para nao derrubar o sync das outras dimensoes caso o endpoint nao exista.
  var nOrigins = 0;
  try {
    var origins = fetchAll_('/origins', {}).data || [];
    replaceSheet_('dim_origins', ['origin_id','origin_name'],
      origins.map(function (o) { return [o.id, o.name]; }));
    nOrigins = origins.length;
  } catch (eOrig) {
    sheetOrCreate_('dim_origins', ['origin_id','origin_name']);
    Logger.log('Origens: falha ao buscar /origins (' + eOrig + ') — dim_origins mantida vazia');
  }

  Logger.log('Dimensoes: ' + stages.length + ' etapas, ' + users.length + ' usuarios, ' +
    reasons.length + ' motivos, ' + nOrigins + ' origens');
}

/* ====================== Helpers de planilha ====================== */
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheetOrCreate_(name, headers) {
  var sh = ss_().getSheetByName(name) || ss_().insertSheet(name);
  if (sh.getLastRow() === 0 && headers) sh.appendRow(headers);
  return sh;
}
function replaceSheet_(name, headers, rows) {
  var sh = sheetOrCreate_(name, headers);
  sh.clearContents();
  var data = [headers].concat(rows.length ? rows : []);
  sh.getRange(1, 1, data.length, headers.length).setValues(data);
}
function upsertById_(name, headers, rows) {
  var sh = sheetOrCreate_(name, headers);
  var existing = sh.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < existing.length; i++) map[String(existing[i][0])] = i;

  var appends = [];
  rows.forEach(function (r) {
    var id = String(r[0]);
    if (map[id] !== undefined) existing[map[id]] = r;
    else appends.push(r);
  });

  var out = existing.length > 1 ? existing : [headers];
  if (appends.length) out = out.concat(appends);
  out[0] = headers;
  sh.clearContents();
  sh.getRange(1, 1, out.length, headers.length).setValues(out);
}

/* ====================== Controle (incremental) ====================== */
function readControl_(key) {
  var sh = ss_().getSheetByName('_control');
  if (!sh) return null;
  var v = sh.getRange('B1').getValue();
  if (!v) return null;
  // O Sheets pode ter convertido o texto em Data — reformata para o padrao do PipeRun.
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  }
  return String(v);
}
function writeControl_(key, value) {
  var sh = sheetOrCreate_('_control', null);
  sh.getRange('A1').setValue('last_sync');
  // forca a celula como TEXTO puro para o Sheets nao converter em Data
  sh.getRange('B1').setNumberFormat('@').setValue(value);
}
function nowStr_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

/* ====================== Setup + gatilhos ====================== */
function setup() {
  sheetOrCreate_('deals', ['id','title','pipeline_id','stage_id','started_in_stage_id','owner_id','owner_name',
    'company_id','status','value','value_mrr','lost_reason_id','origin_id','temperature','probability',
    'lead_time','created_at','closed_at','updated_at','stage_changed_at','last_stage_updated_at',
    'probably_closed_at','deleted','freezed']);
  sheetOrCreate_('dim_stages', ['stage_id','stage_name','pipeline_id','order']);
  sheetOrCreate_('dim_users', ['user_id','user_name','team']);
  sheetOrCreate_('dim_loss_reasons', ['loss_reason_id','loss_reason_name']);
  sheetOrCreate_('dim_origins', ['origin_id','origin_name']);
  sheetOrCreate_('metas', ['owner_id','pipeline_id','mes','meta_leads','meta_reun_marcadas',
    'meta_reun_realizadas','meta_vendas','meta_ticket','meta_faturamento','meta_taxa_fechamento']);
  sheetOrCreate_('stage_history', ['id','deal_id','pipeline_id','in_stage_id','out_stage_id','in_user_id','out_user_id','in_date','out_date']);
  sheetOrCreate_('activities', ['id','deal_id','pipeline_id','owner_id','status','delivery_date','start_at','end_at','created_at']);
  sheetOrCreate_('activities_done', ['id','deal_id','owner_id','delivery_date']);
  sheetOrCreate_('reunioes', ['id','deal_id','pipeline_id','owner_id','status','created_at','start_at','delivery_date']);
  var c = sheetOrCreate_('_control', null);
  c.getRange('A1').setValue('last_sync');
  Logger.log('Abas criadas/conferidas.');
}

var HORA_SYNC = 6;

function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var fn = t.getHandlerFunction();
    if (['syncDeals','syncDimensions','syncStageHistory','syncActivities','syncActivitiesDone','syncDiarioA','syncDiarioB'].indexOf(fn) >= 0) {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('syncDiarioA').timeBased().everyDays(1).atHour(HORA_SYNC).create();
  ScriptApp.newTrigger('syncDiarioB').timeBased().everyDays(1).atHour(HORA_SYNC).create();
  Logger.log('Gatilhos diarios instalados para ' + HORA_SYNC + 'h.');
}

// Job A: dimensoes + deals
function syncDiarioA() {
  syncDimensions();
  syncDeals();
  Logger.log('Sync diario A concluido (dimensoes + deals).');
}

// Job B: historico + atividades (abertas e realizadas)
function syncDiarioB() {
  syncStageHistory();
  syncActivities();
  syncActivitiesDone();
  syncReunioes();
  Logger.log('Sync diario B concluido (stage_history + activities + activities_done + reunioes).');
}

/* ====================== RESET (recomeca a carga do zero) ====================== */
function resetCarga() {
  var sh = ss_().getSheetByName('deals');
  if (sh) { sh.clearContents(); }
  var c = ss_().getSheetByName('_control');
  if (c) { c.getRange('B1').clearContent(); }
  setup();
  Logger.log('Reset feito. Rode syncDeals() para recarregar os ultimos 24 meses.');
}
