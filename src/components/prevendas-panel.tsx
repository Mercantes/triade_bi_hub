import type { Etapa, Funil } from "@/lib/types";
import { num, pct } from "@/lib/format";
import { attendanceColor, noShowColor } from "@/lib/colors";
import { computePace, buildChartSeries } from "@/lib/pace";
import { mergeEtapasPreVenda } from "@/lib/etapas";
import { HeroMetric } from "./hero-metric";
import { RankingCard, type RankRow } from "./ranking-card";
import { PaceSub } from "./pace-sub";
import { FunnelBars } from "./funnel-bars";
import { MotivosBars } from "./motivos-bars";
import { ReunioesTable } from "./reunioes-table";

function toRows(arr: { vendedor: string; qtd: number }[]): RankRow[] {
  return arr.map((v) => ({ vendedor: v.vendedor, value: v.qtd }));
}

type MetaField = "meta_leads" | "meta_reun_marcadas" | "meta_reun_realizadas";

export function PreVendasPanel({
  funil,
  fromISO,
  mostrarMetas,
  etapasVendas,
}: {
  funil: Funil;
  fromISO: string;
  mostrarMetas: boolean;
  etapasVendas: Etapa[];
}) {
  const m = funil.metricas;
  const metas = m.metas;
  const dias = computePace(0, fromISO, 0);
  const etapasFunil = mergeEtapasPreVenda(funil.pipeline_por_etapa.etapas, etapasVendas);

  // Ideal por dia útil (meta do vendedor ÷ dias úteis do mês), por vendedor.
  const metaByOwner = new Map(
    funil.ranking_metas.vendedores.map((v) => [v.owner_id, v]),
  );
  const idealDia = (ownerId: number, field: MetaField): number => {
    const meta = metaByOwner.get(ownerId)?.[field] ?? 0;
    return dias.diasUteisTotais > 0 ? Math.round(meta / dias.diasUteisTotais) : 0;
  };
  const rowsIdeal = (
    arr: { owner_id: number; vendedor: string; qtd: number }[],
    field: MetaField,
  ): RankRow[] =>
    arr.map((v) => ({
      vendedor: v.vendedor,
      value: v.qtd,
      ideal: idealDia(v.owner_id, field),
    }));
  // Coluna "ideal dia" só faz sentido em período de 1 mês (mesma regra do pace).
  const idealLabel = mostrarMetas ? "ideal dia" : undefined;

  return (
    <div className="space-y-6">
      {/* Cabeçalho da seção */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">SDRs</h2>
        {mostrarMetas && (
          <span className="text-sm text-[#6b7280]">
            Dia útil{" "}
            <span className="font-semibold text-[#111827]">
              {dias.diasUteisDecorridos}
            </span>{" "}
            de {dias.diasUteisTotais}
          </span>
        )}
      </div>

      {/* Cards hero com gráfico + pace */}
      <div className="space-y-4">
        <HeroMetric
          label="Leads abertos"
          metaNoun="leads abertos"
          value={m.leads_abertos}
          meta={metas.leads_abertos}
          serie={buildChartSeries(m.serie_diaria, "leads_abertos", metas.leads_abertos, fromISO)}
          fromISO={fromISO}
          mostrarMeta={mostrarMetas}
        />
        <HeroMetric
          label="Reuniões marcadas"
          metaNoun="reuniões marcadas"
          value={m.reunioes_marcadas}
          meta={metas.reunioes_marcadas}
          serie={buildChartSeries(m.serie_diaria, "reunioes_marcadas", metas.reunioes_marcadas, fromISO)}
          fromISO={fromISO}
          mostrarMeta={mostrarMetas}
        />
        <HeroMetric
          label="Reuniões realizadas"
          metaNoun="reuniões realizadas"
          value={m.reunioes_realizadas}
          meta={metas.reunioes_realizadas}
          serie={buildChartSeries(m.serie_diaria, "reunioes_realizadas", metas.reunioes_realizadas, fromISO)}
          fromISO={fromISO}
          mostrarMeta={mostrarMetas}
        />
      </div>

      {/* Grid de cards por vendedor */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RankingCard
          title="Leads Abertos"
          icon="users"
          accent="#3b82f6"
          total={num(m.leads_abertos)}
          sub={mostrarMetas ? <PaceSub value={m.leads_abertos} meta={metas.leads_abertos} fromISO={fromISO} /> : undefined}
          columnLabel="abertos"
          rows={rowsIdeal(m.leads_abertos_por_vendedor, "meta_leads")}
          idealColumnLabel={idealLabel}
          formatValue={num}
          averageLabel="média leads abertos/vendedor"
        />
        <RankingCard
          title="Reuniões Marcadas"
          icon="calendar"
          accent="#a855f7"
          total={num(m.reunioes_marcadas)}
          sub={mostrarMetas ? <PaceSub value={m.reunioes_marcadas} meta={metas.reunioes_marcadas} fromISO={fromISO} /> : undefined}
          columnLabel="marcadas"
          rows={rowsIdeal(m.reunioes_marcadas_por_vendedor, "meta_reun_marcadas")}
          idealColumnLabel={idealLabel}
          formatValue={num}
          averageLabel="média marcadas/vendedor"
        />
        <RankingCard
          title="Reuniões Realizadas"
          icon="check-circle"
          accent="#22c55e"
          total={num(m.reunioes_realizadas)}
          sub={mostrarMetas ? <PaceSub value={m.reunioes_realizadas} meta={metas.reunioes_realizadas} fromISO={fromISO} /> : undefined}
          columnLabel="realizadas"
          rows={rowsIdeal(m.reunioes_realizadas_por_vendedor, "meta_reun_realizadas")}
          idealColumnLabel={idealLabel}
          formatValue={num}
          averageLabel="média realizadas/vendedor"
        />
        <RankingCard
          title="Taxa de Comparecimento"
          icon="user-check"
          accent="#2dd4bf"
          unavailable={!mostrarMetas}
          unavailableHint="Taxa só faz sentido em período de 1 mês."
          total={
            <span className={attendanceColor(m.taxa_comparecimento)}>
              {pct(m.taxa_comparecimento)}
            </span>
          }
          columnLabel="realizadas"
          rows={m.comparecimento_por_vendedor.map((v) => ({
            vendedor: v.vendedor,
            value: v.pct,
          }))}
          formatValue={(v) => pct(v)}
          averageLabel="média comparecimento/vendedor"
        />
        <RankingCard
          title="Leads para Abrir"
          icon="inbox"
          accent="#06b6d4"
          total={num(m.leads_para_abrir)}
          columnLabel="na fila"
          rows={toRows(m.leads_para_abrir_por_vendedor)}
          formatValue={num}
          averageLabel="média na fila/vendedor"
        />
        <RankingCard
          title="Atividades Realizadas"
          icon="calendar-check"
          accent="#f97316"
          total={num(m.atividades_realizadas ?? 0)}
          columnLabel="realizadas"
          rows={toRows(m.atividades_realizadas_por_vendedor ?? [])}
          formatValue={num}
          averageLabel="média atividades/vendedor"
        />
        <RankingCard
          title="Atividades Atrasadas"
          icon="clock"
          accent="#ef4444"
          total={
            <span className={m.atividades_atrasadas > 0 ? "text-[#e50914]" : undefined}>
              {num(m.atividades_atrasadas)}
            </span>
          }
          columnLabel="atrasadas"
          rows={toRows(m.atividades_atrasadas_por_vendedor)}
          formatValue={num}
          averageLabel="média atrasadas/vendedor"
        />
        <RankingCard
          title="No-Show"
          icon="user-x"
          accent="#f59e0b"
          unavailable={!mostrarMetas}
          unavailableHint="Taxa só faz sentido em período de 1 mês."
          total={
            m.taxa_comparecimento == null ? (
              "—"
            ) : (
              <span className={noShowColor(100 - m.taxa_comparecimento)}>
                {pct(100 - m.taxa_comparecimento)}
              </span>
            )
          }
          columnLabel="no-show"
          rows={m.comparecimento_por_vendedor.map((v) => ({
            vendedor: v.vendedor,
            value: 100 - v.pct,
          }))}
          formatValue={(v) => pct(v)}
          averageLabel="média no-show/vendedor"
        />
      </section>

      {/* Funil + Motivos de perda */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FunnelBars etapas={etapasFunil} showValue={false} />
        <MotivosBars motivos={funil.ganhos_perdas.motivos_perda} />
      </section>

      {/* Reuniões do mês */}
      <ReunioesTable reunioes={m.reunioes_detalhe} vendedorLabel="Vendedor" />
    </div>
  );
}
