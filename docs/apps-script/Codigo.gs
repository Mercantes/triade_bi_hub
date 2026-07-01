/**
 * BI Triade — PipeRun -> Google Sheets -> Web App (doGet/doPost)
 * BACKUP versionado do Apps Script (arquivo "Código.gs").
 * O original vive no projeto Apps Script "BI Triade - PipeRun".
 *
 * Acoes:
 *   GET  ?from=...&to=...      -> BI completo (funis Pre-Vendas + Vendas)
 *   GET  ?action=usuarios      -> { ok, usuarios:[{owner_id, nome}] }
 *   POST {action:'save_metas_rows', pipeline_id, mes, rows:[...]} -> grava aba `metas`
 */

var VALUE_DIVISOR = 1; // PipeRun da Triade devolve value em REAIS

var PIPELINE_NAMES = {
  '100776': 'Pre-Vendas',
  '54068': 'Vendas'
};

// Funis que compoem a PRE-VENDA (Vanessa 100776 + pre-venda das vendedoras 54068)
var PREVENDAS_PIPES = ['100776', '54068'];

function doGet(e) {
  // Lista de usuarios (para "adicionar vendedor" no modal de metas)
  if (e && e.parameter && e.parameter.action === 'usuarios') {
    return jsonOut_({ ok: true, usuarios: readSheet_('dim_users').map(function (u) {
      return { owner_id: Number(u.user_id), nome: u.user_name || ('Usuario ' + u.user_id) };
    }) });
  }

  try {
    var p = (e && e.parameter) || {};
    var period = resolvePeriod_(p.from, p.to);

    var deals = readSheet_('deals').filter(function (d) { return !truthy_(d.deleted); });
    var stagesArr = readSheet_('dim_stages');
    var stages = indexBy_(stagesArr, 'stage_id');
    var users = indexBy_(readSheet_('dim_users'), 'user_id');
    var reasons = indexBy_(readSheet_('dim_loss_reasons'), 'loss_reason_id');
    var origins = indexBy_(readSheet_('dim_origins'), 'origin_id');
    var metas = readSheet_('metas');
    var hist = readSheet_('stage_history');
    var acts = readSheet_('activities');
    var reunioes = readSheet_('reunioes');
    var dealIdx = {}; deals.forEach(function (d) { dealIdx[String(d.id)] = d; });

    // Stages de "reuniao agendada/marcada" (qualquer pipeline) — para achar a pre-vendedora dos deals.
    var reuniaoStageIds = stagesArr.filter(function (s) {
      var n = norm_(s.stage_name);
      return n.indexOf('reuni') >= 0 && (n.indexOf('agenda') >= 0 || n.indexOf('marc') >= 0);
    }).map(function (s) { return String(s.stage_id); });

    var byPipe = {};
    deals.forEach(function (d) {
      var k = String(d.pipeline_id);
      (byPipe[k] = byPipe[k] || []).push(d);
    });

    var funis = Object.keys(byPipe).map(function (pid) {
      var ds = byPipe[pid];
      var stagesPipe = stagesArr.filter(function (s) { return String(s.pipeline_id) === pid; });
      return {
        pipeline_id: Number(pid),
        nome: PIPELINE_NAMES[pid] || ('Funil ' + pid),
        pipeline_por_etapa: pipelinePorEtapa_(ds, stages),
        ganhos_perdas: ganhosPerdas_(ds, period, reasons),
        conversao_ciclo: conversaoCiclo_(ds, period),
        conversao_origem: conversaoOrigem_(ds, period, origins),
        vendas_detalhe: vendasDetalhe_(ds, period, users, origins, hist, reuniaoStageIds),
        vendas_mensais: vendasMensais_(ds),
        ranking_metas: rankingMetas_(ds, period, users, metas, pid),
        metricas: (String(pid) === '100776')
          ? metricasPreVendasAgg_(PREVENDAS_PIPES, deals, stagesArr, hist, acts, period, users, metas, reunioes, dealIdx)
          : metricasFunnel_(pid, ds, stagesPipe, hist, acts, period, users, metas, reunioes, dealIdx)
      };
    });

    // Atividades realizadas (status 2) no periodo — time todo, anexado ao funil Pre-Vendas
    var actsDone = readSheet_('activities_done');
    var ativR = actsDone.filter(function (a) { return inPeriod_(a.delivery_date, period); });
    var byOwnerAtivR = {};
    ativR.forEach(function (a) { var o = String(a.owner_id); byOwnerAtivR[o] = (byOwnerAtivR[o] || 0) + 1; });
    var ativRPorVend = Object.keys(byOwnerAtivR).map(function (o) {
      var u = users[o] || {};
      return { owner_id: Number(o), vendedor: u.user_name || ('Usuario ' + o), qtd: byOwnerAtivR[o] };
    }).sort(function (a, b) { return b.qtd - a.qtd; });
    var pvFunil = funis.filter(function (f) { return String(f.pipeline_id) === '100776'; })[0];
    if (pvFunil) {
      pvFunil.metricas.atividades_realizadas = ativR.length;
      pvFunil.metricas.atividades_realizadas_por_vendedor = ativRPorVend;
    }

    return out_({ ok: true, period: { from: period.fromStr, to: period.toStr }, funis: funis, updated_at: new Date().toISOString() }, p.callback);
  } catch (err) {
    return out_({ ok: false, error: String(err) }, e && e.parameter && e.parameter.callback);
  }
}

/* ---------- Bloco 1: Pipeline por etapa (valor em aberto) ---------- */
// Considera só deals ATIVOS: status 0 (aberto) e nao congelados (freezed).
function pipelinePorEtapa_(deals, stages) {
  var abertas = deals.filter(function (d) { return Number(d.status) === 0 && !truthy_(d.freezed); });
  var byStage = {};
  abertas.forEach(function (d) {
    var k = d.stage_id;
    if (!byStage[k]) byStage[k] = { stage_id: Number(k), qtd: 0, valor: 0 };
    byStage[k].qtd += 1;
    byStage[k].valor += num_(d.value) / VALUE_DIVISOR;
  });
  var rows = Object.keys(byStage).map(function (k) {
    var s = stages[k] || {};
    byStage[k].stage_name = s.stage_name || ('Etapa ' + k);
    byStage[k].order = num_(s.order);
    byStage[k].valor = round2_(byStage[k].valor);
    return byStage[k];
  });
  rows.sort(function (a, b) { return a.order - b.order; });
  return {
    etapas: rows,
    total_aberto: round2_(rows.reduce(function (s, r) { return s + r.valor; }, 0)),
    total_oportunidades: rows.reduce(function (s, r) { return s + r.qtd; }, 0)
  };
}

/* ---------- Bloco 2: Ganhos / Perdas + motivos ---------- */
function ganhosPerdas_(deals, period, reasons) {
  var ganhas = deals.filter(function (d) { return Number(d.status) === 1 && inPeriod_(d.closed_at, period); });
  var perdidas = deals.filter(function (d) { return Number(d.status) === 3 && inPeriod_(d.closed_at, period); });

  var motivos = {};
  perdidas.forEach(function (d) {
    var k = d.lost_reason_id || 'sem_motivo';
    if (!motivos[k]) {
      var r = reasons[k] || {};
      motivos[k] = { motivo: r.loss_reason_name || 'Sem motivo', qtd: 0, valor: 0 };
    }
    motivos[k].qtd += 1;
    motivos[k].valor += num_(d.value) / VALUE_DIVISOR;
  });
  var motivosArr = Object.keys(motivos).map(function (k) { motivos[k].valor = round2_(motivos[k].valor); return motivos[k]; });
  motivosArr.sort(function (a, b) { return b.qtd - a.qtd; });

  return {
    ganhos: { qtd: ganhas.length, valor: round2_(sumVal_(ganhas)) },
    perdas: { qtd: perdidas.length, valor: round2_(sumVal_(perdidas)) },
    motivos_perda: motivosArr
  };
}

/* ---------- Bloco 3: Conversao e ciclo ---------- */
function conversaoCiclo_(deals, period) {
  var ganhas = deals.filter(function (d) { return Number(d.status) === 1 && inPeriod_(d.closed_at, period); });
  var perdidas = deals.filter(function (d) { return Number(d.status) === 3 && inPeriod_(d.closed_at, period); });
  var fechadas = ganhas.length + perdidas.length;

  var ciclos = ganhas.map(function (d) {
    var c = parseDate_(d.created_at), f = parseDate_(d.closed_at);
    return (c && f) ? (f - c) / 86400000 : null;
  }).filter(function (x) { return x !== null && x >= 0; });

  var ganhasComValor = ganhas.filter(function (d) { return num_(d.value) > 0; });

  return {
    win_rate: fechadas ? round2_((ganhas.length / fechadas) * 100) : 0,
    ciclo_medio_dias: ciclos.length ? round2_(avg_(ciclos)) : 0,
    ticket_medio: ganhasComValor.length ? round2_(sumVal_(ganhasComValor) / ganhasComValor.length) : 0,
    fechadas_periodo: fechadas
  };
}

/* ---------- Bloco 3b: Conversao por origem do lead ---------- */
// Base = deals criados no periodo, agrupados por origem. Para cada origem:
// total = leads criados | ganhos = quantos viraram venda (status 1) | taxa = ganhos/total.
function conversaoOrigem_(deals, period, origins) {
  var base = deals.filter(function (d) { return inPeriod_(d.created_at, period); });
  var by = {};
  base.forEach(function (d) {
    var oid = (d.origin_id === '' || d.origin_id == null) ? 'sem' : String(d.origin_id);
    if (!by[oid]) {
      var nome = (oid === 'sem')
        ? 'Sem origem'
        : ((origins[oid] || {}).origin_name || ('Origem ' + oid));
      by[oid] = { origem: nome, total: 0, ganhos: 0 };
    }
    by[oid].total += 1;
    if (Number(d.status) === 1) by[oid].ganhos += 1;
  });
  var rows = Object.keys(by).map(function (k) {
    var r = by[k];
    r.taxa = r.total ? round2_((r.ganhos / r.total) * 100) : 0;
    return r;
  });
  rows.sort(function (a, b) { return b.total - a.total; });
  return rows;
}

/* ---------- Bloco 3c: Deals fechados (ganhos) no periodo ---------- */
// pre_vendedora = quem moveu o deal para "Reuniao Agendada/Marcada" (1o registro no historico).
function vendasDetalhe_(deals, period, users, origins, hist, reuniaoStageIds) {
  // mapa deal_id -> usuario que marcou a reuniao (o registro mais antigo)
  var preByDeal = {}, preDate = {};
  (hist || []).forEach(function (h) {
    if (reuniaoStageIds.indexOf(String(h.in_stage_id)) < 0) return;
    var did = String(h.deal_id);
    var dt = parseDate_(h.in_date);
    if (preByDeal[did] === undefined || (dt && preDate[did] && dt < preDate[did])) {
      preByDeal[did] = String(h.in_user_id);
      preDate[did] = dt;
    }
  });

  var ganhas = deals.filter(function (d) {
    return Number(d.status) === 1 && inPeriod_(d.closed_at, period);
  });
  return ganhas.map(function (d) {
    var u = users[String(d.owner_id)] || {};
    var oid = (d.origin_id === '' || d.origin_id == null) ? null : String(d.origin_id);
    var origem = oid ? ((origins[oid] || {}).origin_name || ('Origem ' + oid)) : 'Sem origem';
    var preId = preByDeal[String(d.id)];
    var pre = preId ? ((users[preId] || {}).user_name || ('Usuario ' + preId)) : '';
    return {
      cliente: d.title || ('Deal ' + d.id),
      pre_vendedora: pre,
      vendedor: u.user_name || '',
      valor: round2_(num_(d.value) / VALUE_DIVISOR),
      fechado_em: d.closed_at || '',
      origem: origem
    };
  }).sort(function (a, b) { return String(b.fechado_em).localeCompare(String(a.fechado_em)); });
}

/* ---------- Bloco 3d: Vendas por mes (para comparativo ano a ano) ---------- */
// Agrupa deals ganhos (status 1) por ano-mes do fechamento. Usa TODOS os deals do
// funil (nao filtra periodo), pois o grafico compara os ultimos ~24 meses.
function vendasMensais_(deals) {
  var by = {};
  deals.forEach(function (d) {
    if (Number(d.status) !== 1) return;
    var dt = parseDate_(d.closed_at);
    if (!dt) return;
    var ano = dt.getFullYear(), mes = dt.getMonth() + 1;
    var k = ano + '-' + mes;
    if (!by[k]) by[k] = { ano: ano, mes: mes, faturamento: 0, vendas: 0 };
    by[k].faturamento += num_(d.value) / VALUE_DIVISOR;
    by[k].vendas += 1;
  });
  return Object.keys(by).map(function (k) {
    var o = by[k]; o.faturamento = round2_(o.faturamento); return o;
  }).sort(function (a, b) { return a.ano - b.ano || a.mes - b.mes; });
}

/* ---------- Bloco 4: Ranking + metas (por vendedor) ---------- */
function rankingMetas_(deals, period, users, metas, pipelineId) {
  var mes = period.toStr.substring(0, 7);
  var metaByOwner = {};
  metas.forEach(function (m) {
    if (normMes_(m.mes) === mes && String(m.pipeline_id) === String(pipelineId)) {
      metaByOwner[String(m.owner_id)] = m;
    }
  });

  var ganhas = deals.filter(function (d) { return Number(d.status) === 1 && inPeriod_(d.closed_at, period); });
  var byOwner = {};
  ganhas.forEach(function (d) {
    var k = String(d.owner_id);
    if (!byOwner[k]) byOwner[k] = { owner_id: Number(k), qtd: 0, valor: 0 };
    byOwner[k].qtd += 1;
    byOwner[k].valor += num_(d.value) / VALUE_DIVISOR;
  });

  Object.keys(metaByOwner).forEach(function (k) {
    if (!byOwner[k]) byOwner[k] = { owner_id: Number(k), qtd: 0, valor: 0 };
  });

  function pct(real, meta) { return meta ? round2_((real / meta) * 100) : null; }

  var rows = Object.keys(byOwner).map(function (k) {
    var o = byOwner[k];
    var u = users[k] || {};
    var m = metaByOwner[k] || {};
    o.vendedor = u.user_name || ('Usuario ' + k);
    o.valor = round2_(o.valor);
    o.ticket = o.qtd ? round2_(o.valor / o.qtd) : 0;

    o.meta_vendas = num_(m.meta_vendas) || 0;
    o.meta_faturamento = num_(m.meta_faturamento) || 0;
    o.meta_ticket = num_(m.meta_ticket) || 0;
    o.meta_leads = num_(m.meta_leads) || 0;
    o.meta_reun_marcadas = num_(m.meta_reun_marcadas) || 0;
    o.meta_reun_realizadas = num_(m.meta_reun_realizadas) || 0;
    o.meta_taxa_fechamento = num_(m.meta_taxa_fechamento) || 0;

    o.atingimento_vendas_pct = pct(o.qtd, o.meta_vendas);
    o.atingimento_faturamento_pct = pct(o.valor, o.meta_faturamento);

    o.meta_valor = o.meta_faturamento;
    o.atingimento_valor_pct = o.atingimento_faturamento_pct;
    o.meta_qtd = o.meta_vendas;
    o.atingimento_qtd_pct = o.atingimento_vendas_pct;
    return o;
  });
  rows.sort(function (a, b) { return b.valor - a.valor || b.qtd - a.qtd; });
  return { vendedores: rows };
}

/* ---------- Reunioes por ATIVIDADE (tipo "Reuniao de Vendas") ----------
 * Regua igual ao PipeRun: conta atividades de reuniao, nao movimento de etapa.
 *   marcadas   = reuniao com start_at (agendada) no periodo
 *   realizadas = reuniao concluida (status 2) com delivery_date no periodo
 *   no_show    = reuniao aberta (status 0) agendada no periodo cuja data ja passou
 */
function reuniaoMetrics_(reunioes, period, pidSet, users, dealIdx, hist, noShowStageIds) {
  var esc = reunioes.filter(function (r) { return pidSet[String(r.pipeline_id)]; });

  var marc = esc.filter(function (r) { return inPeriod_(r.start_at, period); });
  var real = esc.filter(function (r) { return Number(r.status) === 2 && inPeriod_(r.delivery_date, period); });

  // No-Show pela ETAPA "No Show" do funil (stage_history), scopado por pipeline.
  var nsDeals = {}, nsByOwner = {};
  (hist || []).forEach(function (h) {
    if (!pidSet[String(h.pipeline_id)]) return;
    if (noShowStageIds.indexOf(String(h.in_stage_id)) < 0) return;
    if (!inPeriod_(h.in_date, period)) return;
    var did = String(h.deal_id);
    if (nsDeals[did]) return;
    nsDeals[did] = true;
    var o = String(h.in_user_id);
    nsByOwner[o] = (nsByOwner[o] || 0) + 1;
  });
  var noShow = Object.keys(nsDeals).length;

  function porOwner(arr) {
    var by = {}; arr.forEach(function (r) { var o = String(r.owner_id); by[o] = (by[o] || 0) + 1; });
    return Object.keys(by).map(function (o) {
      var u = users[o] || {};
      return { owner_id: Number(o), vendedor: u.user_name || ('Usuario ' + o), qtd: by[o] };
    }).sort(function (a, b) { return b.qtd - a.qtd; });
  }
  var marcPV = porOwner(marc), realPV = porOwner(real);
  var mapR = {}; realPV.forEach(function (x) { mapR[x.owner_id] = x.qtd; });

  // Comparecimento por vendedor = realizadas / (realizadas + no-show)
  var owners = {}; realPV.forEach(function (x) { owners[x.owner_id] = true; }); Object.keys(nsByOwner).forEach(function (o) { owners[o] = true; });
  var compPV = Object.keys(owners).map(function (oid) {
    var rl = mapR[oid] || 0, ns = nsByOwner[oid] || 0, tot = rl + ns; var u = users[oid] || {};
    return { owner_id: Number(oid), vendedor: u.user_name || ('Usuario ' + oid), pct: tot ? round2_((rl / tot) * 100) : null };
  }).sort(function (a, b) { return (b.pct || 0) - (a.pct || 0); });

  // detalhe: uniao (marcadas + realizadas do periodo), 1 linha por atividade
  var detIdx = {};
  marc.forEach(function (r) { detIdx[String(r.id)] = r; });
  real.forEach(function (r) { detIdx[String(r.id)] = r; });
  var detalhe = Object.keys(detIdx).map(function (id) {
    var r = detIdx[id];
    var d = dealIdx[String(r.deal_id)] || {};
    var u = users[String(r.owner_id)] || {};
    var realizada = Number(r.status) === 2 && inPeriod_(r.delivery_date, period);
    return {
      cliente: d.title || ('Deal ' + r.deal_id),
      vendedor: u.user_name || '',
      marcada_em: r.start_at || '',
      realizada_em: realizada ? (r.delivery_date || '') : '',
      status: realizada ? 'Realizada' : 'Agendada'
    };
  }).sort(function (a, b) { return String(b.realizada_em || b.marcada_em).localeCompare(String(a.realizada_em || a.marcada_em)); });

  var totComp = real.length + noShow;
  return {
    marcadas: marc.length,
    realizadas: real.length,
    no_show: noShow,
    taxa_comparecimento: totComp ? round2_((real.length / totComp) * 100) : null,
    marcadas_por_vendedor: marcPV,
    realizadas_por_vendedor: realPV,
    comparecimento_por_vendedor: compPV,
    detalhe: detalhe,
    marc: marc,
    real: real
  };
}

/* ---------- Bloco 5: Metricas SDR/Funil (Vendas, 1 pipeline) ---------- */
function metricasFunnel_(pipelineId, deals, stagesPipe, hist, acts, period, users, metas, reunioes, dealIdx) {
  var entradaIds = stagesPipe.filter(function (s) { return norm_(s.stage_name) === 'entrada'; })
    .map(function (s) { return String(s.stage_id); });
  var noShowStageIds = stagesPipe.filter(function (s) {
    var n = norm_(s.stage_name); return n.indexOf('no show') >= 0 || n.indexOf('noshow') >= 0;
  }).map(function (s) { return String(s.stage_id); });

  // Reunioes por ATIVIDADE (tipo Reuniao de Vendas), scopadas neste pipeline. No-show pela etapa.
  var pidSet = {}; pidSet[String(pipelineId)] = true;
  var rm = reuniaoMetrics_(reunioes, period, pidSet, users, dealIdx, hist, noShowStageIds);

  var leadsDoPeriodo = deals.filter(function (d) { return inPeriod_(d.created_at, period); });
  var leadsAbertos = leadsDoPeriodo.length;
  var leadsFila = deals.filter(function (d) {
    return Number(d.status) === 0 && !truthy_(d.freezed) && entradaIds.indexOf(String(d.stage_id)) >= 0;
  });
  var leadsParaAbrir = leadsFila.length;

  var leadsAbertosPorVend = agrupaPorOwner_(leadsDoPeriodo, users);
  var leadsParaAbrirPorVend = agrupaPorOwner_(leadsFila, users);

  // atividades atrasadas (abertas com dia agendado passado), scopadas neste pipeline
  var atrasadas = acts.filter(function (a) {
    return String(a.pipeline_id) === String(pipelineId) && atrasadaAberta_(a);
  });
  var porOwnerAtr = {};
  atrasadas.forEach(function (a) { var o = String(a.owner_id); porOwnerAtr[o] = (porOwnerAtr[o] || 0) + 1; });
  var atrasadasArr = Object.keys(porOwnerAtr).map(function (o) {
    var u = users[o] || {};
    return { owner_id: Number(o), vendedor: u.user_name || ('Usuario ' + o), qtd: porOwnerAtr[o] };
  }).sort(function (a, b) { return b.qtd - a.qtd; });

  var mesRef = period.toStr.substring(0, 7);
  var metaFunil = { leads_abertos: 0, reunioes_marcadas: 0, reunioes_realizadas: 0, vendas: 0, faturamento: 0 };
  (metas || []).forEach(function (m) {
    if (String(m.pipeline_id) === String(pipelineId) && normMes_(m.mes) === mesRef) {
      metaFunil.leads_abertos += num_(m.meta_leads);
      metaFunil.reunioes_marcadas += num_(m.meta_reun_marcadas);
      metaFunil.reunioes_realizadas += num_(m.meta_reun_realizadas);
      metaFunil.vendas += num_(m.meta_vendas);
      metaFunil.faturamento += num_(m.meta_faturamento);
    }
  });

  var serie = serieDiaria_(leadsDoPeriodo, rm.marc, rm.real, period);

  return {
    leads_abertos: leadsAbertos,
    leads_para_abrir: leadsParaAbrir,
    reunioes_marcadas: rm.marcadas,
    reunioes_realizadas: rm.realizadas,
    no_show: rm.no_show,
    taxa_comparecimento: rm.taxa_comparecimento,
    atividades_atrasadas: atrasadas.length,
    metas: metaFunil,
    atividades_atrasadas_por_vendedor: atrasadasArr,
    reunioes_marcadas_por_vendedor: rm.marcadas_por_vendedor,
    reunioes_realizadas_por_vendedor: rm.realizadas_por_vendedor,
    leads_abertos_por_vendedor: leadsAbertosPorVend,
    leads_para_abrir_por_vendedor: leadsParaAbrirPorVend,
    comparecimento_por_vendedor: rm.comparecimento_por_vendedor,
    serie_diaria: serie,
    reunioes_detalhe: rm.detalhe
  };
}

/* ---------- Bloco 5b: Pre-Vendas agregada (100776 + pre-venda do 54068) ---------- */
function metricasPreVendasAgg_(targetPids, allDeals, stagesArr, hist, acts, period, users, metas, reunioes, dealIdx) {
  var pidSet = {}; targetPids.forEach(function (p) { pidSet[String(p)] = true; });

  var entradaIds = [], noShowStageIds = [];
  stagesArr.forEach(function (s) {
    if (!pidSet[String(s.pipeline_id)]) return;
    var n = norm_(s.stage_name);
    if (n === 'entrada') entradaIds.push(String(s.stage_id));
    if (n.indexOf('no show') >= 0 || n.indexOf('noshow') >= 0) noShowStageIds.push(String(s.stage_id));
  });

  var deals = allDeals.filter(function (d) { return pidSet[String(d.pipeline_id)]; });

  // Reunioes por ATIVIDADE (tipo Reuniao de Vendas), scopadas nos pipelines-alvo. No-show pela etapa.
  var rm = reuniaoMetrics_(reunioes, period, pidSet, users, dealIdx, hist, noShowStageIds);

  var leadsDoPeriodo = deals.filter(function (d) { return inPeriod_(d.created_at, period); });
  var leadsFila = deals.filter(function (d) { return Number(d.status) === 0 && !truthy_(d.freezed) && entradaIds.indexOf(String(d.stage_id)) >= 0; });
  var leadsAbertosPorVend = agrupaPorOwner_(leadsDoPeriodo, users);
  var leadsParaAbrirPorVend = agrupaPorOwner_(leadsFila, users);

  // atividades atrasadas — time todo (mesma regra das realizadas)
  var atrasadas = acts.filter(function (a) { return atrasadaAberta_(a); });
  var porOwnerAtr = {}; atrasadas.forEach(function (a) { var o = String(a.owner_id); porOwnerAtr[o] = (porOwnerAtr[o] || 0) + 1; });
  var atrasadasArr = Object.keys(porOwnerAtr).map(function (o) { var u = users[o] || {}; return { owner_id: Number(o), vendedor: u.user_name || ('Usuario ' + o), qtd: porOwnerAtr[o] }; }).sort(function (a, b) { return b.qtd - a.qtd; });

  var mesRef = period.toStr.substring(0, 7);
  var metaFunil = { leads_abertos: 0, reunioes_marcadas: 0, reunioes_realizadas: 0, vendas: 0, faturamento: 0 };
  (metas || []).forEach(function (m) {
    if (pidSet[String(m.pipeline_id)] && normMes_(m.mes) === mesRef) {
      metaFunil.leads_abertos += num_(m.meta_leads);
      metaFunil.reunioes_marcadas += num_(m.meta_reun_marcadas);
      metaFunil.reunioes_realizadas += num_(m.meta_reun_realizadas);
    }
  });

  var serie = serieDiaria_(leadsDoPeriodo, rm.marc, rm.real, period);

  return {
    leads_abertos: leadsDoPeriodo.length,
    leads_para_abrir: leadsFila.length,
    reunioes_marcadas: rm.marcadas,
    reunioes_realizadas: rm.realizadas,
    no_show: rm.no_show,
    taxa_comparecimento: rm.taxa_comparecimento,
    atividades_atrasadas: atrasadas.length,
    metas: metaFunil,
    atividades_atrasadas_por_vendedor: atrasadasArr,
    reunioes_marcadas_por_vendedor: rm.marcadas_por_vendedor,
    reunioes_realizadas_por_vendedor: rm.realizadas_por_vendedor,
    leads_abertos_por_vendedor: leadsAbertosPorVend,
    leads_para_abrir_por_vendedor: leadsParaAbrirPorVend,
    comparecimento_por_vendedor: rm.comparecimento_por_vendedor,
    serie_diaria: serie,
    reunioes_detalhe: rm.detalhe
  };
}

function agrupaPorOwner_(arr, users) {
  var by = {};
  arr.forEach(function (d) { var o = String(d.owner_id); by[o] = (by[o] || 0) + 1; });
  return Object.keys(by).map(function (o) {
    var u = users[o] || {};
    return { owner_id: Number(o), vendedor: u.user_name || ('Usuario ' + o), qtd: by[o] };
  }).sort(function (a, b) { return b.qtd - a.qtd; });
}

function serieDiaria_(leadsDoPeriodo, reunMarc, reunReal, period) {
  var porDia = {};
  function bump(dia, campo) {
    if (!dia) return;
    if (!porDia[dia]) porDia[dia] = { leads: 0, marcadas: 0, realizadas: 0 };
    porDia[dia][campo] += 1;
  }
  leadsDoPeriodo.forEach(function (d) { bump(diaStr_(d.created_at), 'leads'); });
  reunMarc.forEach(function (r) { bump(diaStr_(r.start_at), 'marcadas'); });
  reunReal.forEach(function (r) { bump(diaStr_(r.delivery_date), 'realizadas'); });
  var out = [];
  var acc = { leads: 0, marcadas: 0, realizadas: 0 };
  var cur = new Date(period.from.getTime());
  while (cur <= period.to) {
    var dia = fmt_(cur);
    var d = porDia[dia] || { leads: 0, marcadas: 0, realizadas: 0 };
    acc.leads += d.leads; acc.marcadas += d.marcadas; acc.realizadas += d.realizadas;
    out.push({ dia: dia, leads_abertos: acc.leads, reunioes_marcadas: acc.marcadas, reunioes_realizadas: acc.realizadas });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function diaStr_(v) { var d = parseDate_(v); return d ? fmt_(d) : null; }
function norm_(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

function normMes_(v) {
  if (v instanceof Date) {
    var y = v.getFullYear();
    var mo = ('0' + (v.getMonth() + 1)).slice(-2);
    return y + '-' + mo;
  }
  var s = String(v || '').trim();
  var m;
  m = s.match(/^(\d{4})-(\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2);
  m = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return m[2] + '-' + ('0' + m[1]).slice(-2);
  m = s.match(/^(\d{4})\/(\d{1,2})$/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2);
  return s;
}

/* ---------- Helpers ---------- */
function readSheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) return [];
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  return values.slice(1).map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[String(h).trim()] = row[i]; });
    return obj;
  });
}
function indexBy_(arr, key) { var idx = {}; arr.forEach(function (o) { idx[String(o[key])] = o; }); return idx; }
function resolvePeriod_(from, to) {
  var now = new Date();
  var f = from ? parseDate_(from) : new Date(now.getFullYear(), now.getMonth(), 1);
  var t = to ? parseDate_(to) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
  t.setHours(23, 59, 59, 999);
  return { from: f, to: t, fromStr: fmt_(f), toStr: fmt_(t) };
}
function inPeriod_(dateStr, period) { var d = parseDate_(dateStr); return d && d >= period.from && d <= period.to; }
function parseDate_(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  var s = String(v).trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); // data pura = meia-noite LOCAL (corrige o -1 dia)
  var d = new Date(s.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}
function fmt_(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function num_(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
function truthy_(v) { return v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true'; }
function sumVal_(arr) { return arr.reduce(function (s, d) { return s + num_(d.value) / VALUE_DIVISOR; }, 0); }
function avg_(arr) { return arr.reduce(function (s, x) { return s + x; }, 0) / arr.length; }
function round2_(n) { return Math.round(n * 100) / 100; }
function out_(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

// Atividade aberta atrasada = dia agendado (start_at) ja passou
function atrasadaAberta_(a) {
  if (Number(a.status) !== 0) return false;
  var d = parseDate_(a.start_at);
  if (!d) return false;
  var hoje = new Date();
  hoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()) < hoje;
}

/**
 * preencheMetas — opcional: regrava metas iniciais por vendedor (mes 2026-06).
 * Rode UMA vez se quiser resetar a aba. Depois use o botao "Editar metas" no app.
 */
function preencheMetas() {
  var MES = '2026-06';
  var dados = [
    [94393, 100776, MES, 300, 20, 15, 0, 0, 0, 0],   // Vanessa Souza (Pre-Vendas)
    [57167, 54068, MES, 0, 0, 15, 3, 800, 2400, 20], // Ana Paula Hebling
    [75064, 54068, MES, 0, 0, 15, 3, 800, 2400, 20], // Jaqueline Ricardo
    [57166, 54068, MES, 0, 0, 15, 3, 800, 2400, 20], // Glauce Rezende
    [57159, 54068, MES, 0, 0, 15, 3, 800, 2400, 20]  // Elaine Taveiros
  ];
  var headers = METAS_HEADERS;
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('metas');
  if (!sh) sh = SpreadsheetApp.getActiveSpreadsheet().insertSheet('metas');
  sh.clearContents();
  sh.getRange(1, 3, sh.getMaxRows(), 1).setNumberFormat('@');
  var out = [headers].concat(dados);
  sh.getRange(1, 1, out.length, headers.length).setValues(out);
  Logger.log('Metas preenchidas: ' + dados.length + ' vendedores (mes ' + MES + ').');
}

/* ===================== Gravacao de metas pelo app (CRUD aba `metas`) ===================== */
function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

var METAS_HEADERS = ['owner_id','pipeline_id','mes','meta_leads','meta_reun_marcadas',
  'meta_reun_realizadas','meta_vendas','meta_ticket','meta_faturamento','meta_taxa_fechamento'];

// substitui as linhas da aba `metas` daquele funil+mes pelas linhas recebidas
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
  sh.getRange(1, 3, sh.getMaxRows(), 1).setNumberFormat('@');
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
