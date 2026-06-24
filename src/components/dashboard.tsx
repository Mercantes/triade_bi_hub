"use client";

import { useCallback, useEffect, useState } from "react";
import type { BiResponse, Funil, FunilNome } from "@/lib/types";
import { fetchBi } from "@/lib/api";
import { currentMonthRange, displayDate, SHORTCUTS, type Range } from "@/lib/dates";
import { dateTimeBR } from "@/lib/format";
import { PreVendasPanel } from "./prevendas-panel";
import { VendasPanel } from "./vendas-panel";

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

  const funil: Funil | undefined = data?.funis.find((f) => f.nome === tab);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#26262c] bg-[#0d0d0f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 py-3">
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
          </div>
        </div>

        {/* Linha de atualização */}
        <div className="mx-auto max-w-[1400px] px-6 pb-2 text-xs text-[#8a8a93]">
          {data?.period && (
            <span>
              Período: {displayDate(data.period.from)} – {displayDate(data.period.to)}
              {" · "}
            </span>
          )}
          {data?.updated_at && <span>Atualizado em {dateTimeBR(data.updated_at)}</span>}
        </div>
      </header>

      {/* Conteúdo */}
      <main className="mx-auto max-w-[1400px] px-6 py-6">
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

        {!error && funil && (
          <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
            {tab === "Vendas" ? (
              <VendasPanel funil={funil} />
            ) : (
              <PreVendasPanel funil={funil} />
            )}
          </div>
        )}

        {!error && !loading && data && !funil && (
          <p className="py-32 text-center text-[#8a8a93]">
            Funil &quot;{tab}&quot; não encontrado na resposta.
          </p>
        )}
      </main>
    </div>
  );
}
