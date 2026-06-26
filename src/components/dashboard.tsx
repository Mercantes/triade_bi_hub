"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BiResponse,
  Funil,
  FunilNome,
  MetaVendedorEdit,
  Usuario,
} from "@/lib/types";
import { fetchBi, fetchUsuarios, saveMetasRows } from "@/lib/api";
import {
  currentMonthRange,
  displayDate,
  monthLabel,
  SHORTCUTS,
  type Range,
} from "@/lib/dates";
import { dateTimeBR } from "@/lib/format";
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

  const [editOpen, setEditOpen] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [salvandoMetas, setSalvandoMetas] = useState(false);
  const [erroMetas, setErroMetas] = useState<string | null>(null);
  const [metasSalvoOk, setMetasSalvoOk] = useState(false);
  // Snapshot do que foi salvo, por funil+mês — garante que reabrir o modal
  // mostre na hora as metas gravadas, sem esperar o recarregamento (~8s) do BI.
  const [metasSnapshot, setMetasSnapshot] = useState<
    Record<string, MetaVendedorEdit[]>
  >({});

  // Lista de usuários para o seletor "adicionar vendedor". setState em callback.
  useEffect(() => {
    fetchUsuarios().then(setUsuarios);
  }, []);

  // Aplica um novo período: marca carregando e dispara o refetch via effect.
  const applyRange = useCallback((r: Range) => {
    setLoading(true);
    setRange(r);
  }, []);

  // Fetch a cada mudança de período. setState só ocorre após o await (callbacks).
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

  const funil: Funil | undefined = data?.funis.find((f) => f.nome === tab);

  // Mês de referência das metas = mês do fim do período (igual ao backend).
  const mesISO = (data?.period.to ?? range.to).substring(0, 7);
  const mesLabel = monthLabel(data?.period.to ?? range.from);

  const snapKey = `${tab}|${mesISO}`;

  // Pace/meta só fazem sentido em período de 1 mês.
  const mesmoMes = range.from.slice(0, 7) === range.to.slice(0, 7);
  // Etapas do pipeline de Vendas (para agregar no funil da Pré-Vendas).
  const etapasVendas =
    data?.funis.find((f) => f.nome === "Vendas")?.pipeline_por_etapa.etapas ?? [];
  // Métricas agregadas da Pré-Vendas (fonte das "reuniões realizadas" do time).
  const metricasPreVendas = data?.funis.find(
    (f) => f.nome === "Pre-Vendas",
  )?.metricas;

  // Linhas iniciais do modal: snapshot do último save (se houver) ou os
  // vendedores do funil com suas metas atuais.
  const linhasIniciais: MetaVendedorEdit[] = useMemo(() => {
    if (metasSnapshot[snapKey]) return metasSnapshot[snapKey];
    if (!funil) return [];
    return funil.ranking_metas.vendedores.map((v) => ({
      owner_id: v.owner_id,
      vendedor: v.vendedor,
      meta_leads: v.meta_leads,
      meta_reun_marcadas: v.meta_reun_marcadas,
      meta_reun_realizadas: v.meta_reun_realizadas,
      meta_vendas: v.meta_vendas,
      meta_ticket: v.meta_ticket,
      meta_faturamento: v.meta_faturamento,
      meta_taxa_fechamento: v.meta_taxa_fechamento,
    }));
  }, [funil, metasSnapshot, snapKey]);

  const abrirEdicao = useCallback(() => {
    setErroMetas(null);
    setMetasSalvoOk(false);
    setEditOpen(true);
  }, []);

  // Grava as metas por vendedor na fonte; guarda snapshot e recarrega o BI.
  const handleSaveMetas = useCallback(
    (rows: MetaVendedorEdit[]) => {
      if (!funil) return;
      setSalvandoMetas(true);
      setErroMetas(null);
      setMetasSalvoOk(false);
      saveMetasRows(funil.pipeline_id, mesISO, rows)
        .then(() => {
          setMetasSnapshot((prev) => ({ ...prev, [snapKey]: rows }));
          setMetasSalvoOk(true); // mantém o modal aberto com "✓ salvo"
          applyRange({ ...range }); // recarrega o BI em segundo plano
        })
        .catch((e) =>
          setErroMetas(e instanceof Error ? e.message : "Erro ao salvar"),
        )
        .finally(() => setSalvandoMetas(false));
    },
    [funil, mesISO, range, applyRange, snapKey],
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#26262c] bg-[#0d0d0f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-6 py-3 lg:px-10">
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
              onClick={abrirEdicao}
              disabled={!funil}
              className="rounded-lg border border-[#2dd4bf]/40 px-3 py-1.5 text-xs font-medium text-[#2dd4bf] transition-colors hover:bg-[#2dd4bf]/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Editar metas
            </button>
          </div>
        </div>

        {/* Linha de atualização */}
        <div className="mx-auto max-w-[1320px] px-6 pb-2 text-xs text-[#8a8a93] lg:px-10">
          <span>
            Período: {displayDate(range.from)} – {displayDate(range.to)}
            {" · "}
          </span>
          {data?.updated_at && <span>Atualizado em {dateTimeBR(data.updated_at)}</span>}
        </div>
      </header>

      {/* Conteúdo */}
      <main className="mx-auto max-w-[1320px] px-6 py-8 lg:px-10">
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
          <div className="relative">
            {loading && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center pt-24">
                <div className="flex items-center gap-2 rounded-full border border-[#26262c] bg-[#16161a] px-4 py-2 text-sm font-medium text-[#d4d4d8] shadow-lg">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#26262c] border-t-[#e50914]" />
                  Atualizando…
                </div>
              </div>
            )}
            <div className={loading ? "opacity-40 transition-opacity" : "transition-opacity"}>
              {tab === "Vendas" ? (
                <VendasPanel
                  funil={funil}
                  fromISO={range.from}
                  mostrarMetas={mesmoMes}
                  reunioesAgg={metricasPreVendas}
                />
              ) : (
                <PreVendasPanel
                  funil={funil}
                  fromISO={range.from}
                  mostrarMetas={mesmoMes}
                  etapasVendas={etapasVendas}
                />
              )}
            </div>
          </div>
        )}

        {!error && !loading && data && !funil && (
          <p className="py-32 text-center text-[#8a8a93]">
            Funil &quot;{tab}&quot; não encontrado na resposta.
          </p>
        )}
      </main>

      {editOpen && funil && (
        <EditMetasModal
          key={tab}
          funilNome={tab}
          mes={mesLabel}
          linhasIniciais={linhasIniciais}
          usuarios={usuarios}
          salvando={salvandoMetas}
          salvoOk={metasSalvoOk}
          erro={erroMetas}
          onSave={handleSaveMetas}
          onDirty={() => setMetasSalvoOk(false)}
          onClose={() => {
            setEditOpen(false);
            setMetasSalvoOk(false);
          }}
        />
      )}
    </div>
  );
}
