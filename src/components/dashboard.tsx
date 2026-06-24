"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BiResponse, Funil, FunilNome, MetasEdit } from "@/lib/types";
import { fetchBi } from "@/lib/api";
import {
  currentMonthRange,
  displayDate,
  monthLabel,
  SHORTCUTS,
  type Range,
} from "@/lib/dates";
import { dateTimeBR } from "@/lib/format";
import { loadMetasEdit, saveMetasEdit } from "@/lib/metas-store";
import { PreVendasPanel } from "./prevendas-panel";
import { VendasPanel } from "./vendas-panel";
import { EditMetasModal } from "./edit-metas-modal";

const TABS: { label: string; nome: FunilNome }[] = [
  { label: "Pré-Vendas", nome: "Pre-Vendas" },
  { label: "Vendas", nome: "Vendas" },
];

export function Dashboard() {
  const [range, setRange] = useState<Range>(() => currentMonthRange());
  const [data, setData] = useState<BiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<FunilNome>("Vendas");
  // Inicializa do navegador (no SSR retorna null); o conteúdo dependente de
  // metas só renderiza após o fetch no cliente, então não há mismatch.
  const [metasEdit, setMetasEdit] = useState<MetasEdit | null>(loadMetasEdit);
  const [editOpen, setEditOpen] = useState(false);

  // Aplica um novo período: marca carregando e dispara o refetch via effect.
  const applyRange = useCallback((r: Range) => {
    setLoading(true);
    setRange(r);
  }, []);

  // Fetch a cada mudança de período. setState só ocorre após o await
  // (em callbacks), evitando renders em cascata.
  useEffect(() => {
    let cancelled = false;
    fetchBi(range)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Erro ao carregar dados");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const retry = useCallback(() => applyRange({ ...range }), [applyRange, range]);

  const funilBase: Funil | undefined = data?.funis.find((f) => f.nome === tab);

  // Funil com metas sobrescritas (se houver) — aplicado a pace/cards/gráficos.
  // As metas editadas são da equipe; cada painel exibe só as que lhe dizem respeito.
  const funil: Funil | undefined = useMemo(() => {
    if (!funilBase) return undefined;
    if (!metasEdit) return funilBase;
    return {
      ...funilBase,
      metricas: {
        ...funilBase.metricas,
        metas: {
          ...funilBase.metricas.metas,
          leads_abertos: metasEdit.meta_leads,
          reunioes_marcadas: metasEdit.meta_reun_marcadas,
          reunioes_realizadas: metasEdit.meta_reun_realizadas,
          vendas: metasEdit.meta_vendas,
          faturamento: metasEdit.meta_faturamento,
        },
      },
    };
  }, [funilBase, metasEdit]);

  // Valores iniciais do modal: usa as metas editadas, ou deriva da API
  // (leads/marcadas do Pré-Vendas; vendas/ticket/faturamento do Vendas).
  const metasIniciais: MetasEdit = useMemo(() => {
    if (metasEdit) return metasEdit;
    const pv = data?.funis.find((f) => f.nome === "Pre-Vendas")?.metricas.metas;
    const vd = data?.funis.find((f) => f.nome === "Vendas");
    const vdMetas = vd?.metricas.metas;
    const taxas = (vd?.ranking_metas.vendedores ?? [])
      .map((x) => x.meta_taxa_fechamento)
      .filter((n) => n > 0);
    const taxaMedia = taxas.length
      ? taxas.reduce((a, b) => a + b, 0) / taxas.length
      : 0;
    return {
      meta_leads: pv?.leads_abertos ?? 0,
      meta_reun_marcadas: pv?.reunioes_marcadas ?? 0,
      meta_reun_realizadas: vdMetas?.reunioes_realizadas || pv?.reunioes_realizadas || 0,
      meta_vendas: vdMetas?.vendas ?? 0,
      meta_ticket:
        vdMetas && vdMetas.vendas > 0
          ? Math.round(vdMetas.faturamento / vdMetas.vendas)
          : 0,
      meta_faturamento: vdMetas?.faturamento ?? 0,
      meta_taxa_fechamento: Math.round(taxaMedia * 10) / 10,
    };
  }, [metasEdit, data]);

  const handleSaveMetas = useCallback((m: MetasEdit) => {
    setMetasEdit(m);
    saveMetasEdit(m);
    setEditOpen(false);
  }, []);

  const handleResetMetas = useCallback(() => {
    setMetasEdit(null);
    saveMetasEdit(null);
    setEditOpen(false);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#26262c] bg-[#0d0d0f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-6 py-3 lg:px-10">
          {/* Título */}
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#e50914] text-sm font-black text-white">
              T
            </span>
            <h1 className="text-lg font-bold tracking-tight">BI Tríade</h1>
          </div>

          {/* Toggle de funil */}
          <div className="flex rounded-lg border border-[#26262c] bg-[#16161a] p-1">
            {TABS.map((t) => (
              <button
                key={t.nome}
                onClick={() => setTab(t.nome)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  tab === t.nome
                    ? "bg-[#e50914] text-white"
                    : "text-[#8a8a93] hover:text-[#f4f4f5]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Período */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-[#26262c]">
              {SHORTCUTS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => applyRange(s.range())}
                  className="border-r border-[#26262c] bg-[#16161a] px-3 py-1.5 text-xs font-medium text-[#8a8a93] transition-colors last:border-r-0 hover:bg-[#1f1f24] hover:text-[#f4f4f5]"
                >
                  {s.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) => applyRange({ ...range, from: e.target.value })}
              className="rounded-lg border border-[#26262c] bg-[#16161a] px-2.5 py-1.5 text-xs text-[#f4f4f5] outline-none focus:border-[#e50914] [color-scheme:dark]"
            />
            <span className="text-xs text-[#8a8a93]">até</span>
            <input
              type="date"
              value={range.to}
              min={range.from}
              onChange={(e) => applyRange({ ...range, to: e.target.value })}
              className="rounded-lg border border-[#26262c] bg-[#16161a] px-2.5 py-1.5 text-xs text-[#f4f4f5] outline-none focus:border-[#e50914] [color-scheme:dark]"
            />
            <button
              onClick={() => setEditOpen(true)}
              disabled={!funil}
              className="rounded-lg border border-[#2dd4bf]/40 px-3 py-1.5 text-xs font-medium text-[#2dd4bf] transition-colors hover:bg-[#2dd4bf]/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Editar metas
            </button>
          </div>
        </div>

        {/* Linha de atualização */}
        <div className="mx-auto max-w-[1180px] px-6 pb-2 text-xs text-[#8a8a93] lg:px-10">
          <span>
            Período: {displayDate(range.from)} – {displayDate(range.to)}
            {" · "}
          </span>
          {data?.updated_at && <span>Atualizado em {dateTimeBR(data.updated_at)}</span>}
        </div>
      </header>

      {/* Conteúdo */}
      <main className="mx-auto max-w-[1180px] px-6 py-8 lg:px-10">
        {error && (
          <div className="rounded-xl border border-[#e50914]/40 bg-[#e50914]/10 p-6 text-center">
            <p className="font-semibold text-[#e50914]">
              Não foi possível carregar os dados
            </p>
            <p className="mt-1 text-sm text-[#d4d4d8]">{error}</p>
            <button
              onClick={retry}
              className="mt-4 rounded-lg bg-[#e50914] px-4 py-2 text-sm font-medium text-white hover:bg-[#c40810]"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!error && loading && !data && (
          <div className="flex flex-col items-center justify-center py-32 text-[#8a8a93]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#26262c] border-t-[#e50914]" />
            <p className="mt-4 text-sm">Carregando dados…</p>
          </div>
        )}

        {!error && funil && data && (
          <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
            {tab === "Vendas" ? (
              <VendasPanel funil={funil} fromISO={range.from} />
            ) : (
              <PreVendasPanel funil={funil} fromISO={range.from} />
            )}
          </div>
        )}

        {!error && !loading && data && !funil && (
          <p className="py-32 text-center text-[#8a8a93]">
            Funil &quot;{tab}&quot; não encontrado na resposta.
          </p>
        )}
      </main>

      {editOpen && data && (
        <EditMetasModal
          mes={monthLabel(range.from)}
          inicial={metasIniciais}
          temOverride={metasEdit !== null}
          onSave={handleSaveMetas}
          onReset={handleResetMetas}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
