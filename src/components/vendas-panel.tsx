import type { Funil, Metricas } from "@/lib/types";
import { brl, brlOrDash, num, pct } from "@/lib/format";
import { attainmentBar, attainmentText } from "@/lib/colors";
import { buildChartSeries } from "@/lib/pace";
import { Card, SectionTitle, StatCard, ProgressBar } from "./ui";
import { HeroMetric } from "./hero-metric";
import { PaceSub } from "./pace-sub";
import { FunnelBars } from "./funnel-bars";
import { MotivosBars } from "./motivos-bars";
import { ConversaoOrigemCard } from "./conversao-origem-card";
import { VendasYoYChart } from "./vendas-yoy-chart";
import { VendasTable } from "./vendas-table";

function ciclo(dias: number): string {
  if (!dias) return "—";
  return `${dias.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`;
}

export function VendasPanel({
  funil,
  fromISO,
  mostrarMetas,
  reunioesAgg,
}: {
  funil: Funil;
  fromISO: string;
  mostrarMetas: boolean;
  /** Métricas agregadas (Pré-Vendas) — fonte das reuniões realizadas do time. */
  reunioesAgg?: Metricas;
}) {
  const { ganhos_perdas: gp, conversao_ciclo: cc, metricas: m } = funil;
  const metas = m.metas;
  // "Reuniões realizadas" considera todas (Pré-Vendas + Vendas), igual à aba Pré-Vendas.
  const rr = reunioesAgg ?? m;
  // Taxa de Fechamento = Vendas / Reuniões Realizadas.
  const taxaFechamento = rr.reunioes_realizadas
    ? (gp.ganhos.qtd / rr.reunioes_realizadas) * 100
    : null;

  return (
    <div className="space-y-6">
      {/* Hero: reuniões realizadas com curva + pace */}
      <HeroMetric
        label="Reuniões realizadas"
        metaNoun="reuniões realizadas"
        value={rr.reunioes_realizadas}
        meta={rr.metas.reunioes_realizadas}
        serie={buildChartSeries(
          rr.serie_diaria,
          "reunioes_realizadas",
          rr.metas.reunioes_realizadas,
          fromISO,
        )}
        fromISO={fromISO}
        mostrarMeta={mostrarMetas}
      />

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Faturamento"
          value={brl(gp.ganhos.valor)}
          valueClassName="text-[#22c55e]"
          hint={
            mostrarMetas ? (
              <PaceSub
                value={gp.ganhos.valor}
                meta={metas.faturamento}
                fromISO={fromISO}
                format="currency"
              />
            ) : undefined
          }
        />
        <StatCard
          label="Vendas (qtd)"
          value={num(gp.ganhos.qtd)}
          hint={
            mostrarMetas ? (
              <PaceSub value={gp.ganhos.qtd} meta={metas.vendas} fromISO={fromISO} />
            ) : undefined
          }
        />
        <StatCard label="Ticket Médio" value={brlOrDash(cc.ticket_medio)} />
        <StatCard label="Taxa de Fechamento" value={pct(taxaFechamento)} />
        <StatCard label="Ciclo Médio" value={ciclo(cc.ciclo_medio_dias)} />
        <StatCard
          label="Valor em Aberto"
          value={brl(funil.pipeline_por_etapa.total_aberto)}
        />
      </section>

      {/* Funil + Ganhos×Perdas */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FunnelBars etapas={funil.pipeline_por_etapa.etapas} showValue />

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#22c55e]">
                Ganhos
              </p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-[#22c55e]">
                {num(gp.ganhos.qtd)}
              </p>
              <p className="mt-1 text-sm tabular-nums text-[#374151]">
                {brl(gp.ganhos.valor)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#e50914]">
                Perdas
              </p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-[#e50914]">
                {num(gp.perdas.qtd)}
              </p>
              <p className="mt-1 text-sm tabular-nums text-[#374151]">
                {brl(gp.perdas.valor)}
              </p>
            </Card>
          </div>
          <MotivosBars motivos={gp.motivos_perda} />
        </div>
      </section>

      {/* Conversão por origem do lead */}
      <ConversaoOrigemCard origens={funil.conversao_origem ?? []} />

      {/* Ranking meta R$ + Reuniões realizadas por vendedor */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle>Ranking de vendedores (meta R$)</SectionTitle>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[#6b7280]">
                <th className="pb-2 font-medium">Vendedor</th>
                <th className="pb-2 text-right font-medium">Qtd</th>
                <th className="pb-2 text-right font-medium">Faturamento</th>
                <th className="w-40 pb-2 pl-4 font-medium">Atingimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb]">
              {[...funil.ranking_metas.vendedores]
                .sort((a, b) => b.valor - a.valor)
                .map((v) => {
                  const at = v.atingimento_faturamento_pct;
                  return (
                    <tr key={v.owner_id} className="text-[#374151]">
                      <td className="py-2">{v.vendedor}</td>
                      <td className="py-2 text-right tabular-nums">{num(v.qtd)}</td>
                      <td className="py-2 text-right font-semibold tabular-nums text-[#111827]">
                        {brl(v.valor)}
                      </td>
                      <td className="py-2 pl-4">
                        {at == null ? (
                          <span className="text-xs text-[#6b7280]">sem meta</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <ProgressBar pct={at} barClass={attainmentBar(at)} />
                            <span
                              className={`shrink-0 text-xs tabular-nums ${attainmentText(at)}`}
                            >
                              {pct(at)}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              {funil.ranking_metas.vendedores.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#6b7280]">
                    Sem dados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <Card className="p-5">
          <SectionTitle>Reuniões realizadas por vendedor</SectionTitle>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[#6b7280]">
                <th className="pb-2 font-medium">Vendedor</th>
                <th className="pb-2 text-right font-medium">Qtd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb]">
              {[...rr.reunioes_realizadas_por_vendedor]
                .sort((a, b) => b.qtd - a.qtd)
                .map((r) => (
                  <tr key={r.owner_id} className="text-[#374151]">
                    <td className="py-2">{r.vendedor}</td>
                    <td className="py-2 text-right font-semibold tabular-nums text-[#111827]">
                      {num(r.qtd)}
                    </td>
                  </tr>
                ))}
              {rr.reunioes_realizadas_por_vendedor.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-6 text-center text-[#6b7280]">
                    Sem dados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Comparativo ano a ano (mês a mês) */}
      <VendasYoYChart dados={funil.vendas_mensais ?? []} />

      {/* Deals fechados (ganhos) no período */}
      <VendasTable vendas={funil.vendas_detalhe ?? []} />
    </div>
  );
}
