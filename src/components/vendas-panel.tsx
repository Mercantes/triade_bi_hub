import type { Funil } from "@/lib/types";
import { brl, brlOrDash, num, pct } from "@/lib/format";
import { attainmentBar, attainmentText } from "@/lib/colors";
import { Card, SectionTitle, StatCard, ProgressBar } from "./ui";
import { FunnelBars } from "./funnel-bars";
import { MotivosDonut } from "./motivos-donut";

function ciclo(dias: number): string {
  if (!dias) return "—";
  return `${dias.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`;
}

export function VendasPanel({ funil }: { funil: Funil }) {
  const { ganhos_perdas: gp, conversao_ciclo: cc, metricas: m } = funil;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-7">
        <StatCard
          label="Faturamento"
          value={brl(gp.ganhos.valor)}
          valueClassName="text-[#22c55e]"
        />
        <StatCard label="Vendas (qtd)" value={num(gp.ganhos.qtd)} />
        <StatCard label="Ticket Médio" value={brlOrDash(cc.ticket_medio)} />
        <StatCard label="Taxa de Fechamento" value={pct(cc.win_rate)} />
        <StatCard label="Ciclo Médio" value={ciclo(cc.ciclo_medio_dias)} />
        <StatCard label="Reuniões Realizadas" value={num(m.reunioes_realizadas)} />
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
              <p className="mt-1 text-sm tabular-nums text-[#d4d4d8]">
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
              <p className="mt-1 text-sm tabular-nums text-[#d4d4d8]">
                {brl(gp.perdas.valor)}
              </p>
            </Card>
          </div>
          <MotivosDonut motivos={gp.motivos_perda} />
        </div>
      </section>

      {/* Ranking meta R$ + Reuniões realizadas */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle>Ranking de vendedores (meta R$)</SectionTitle>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[#8a8a93]">
                <th className="pb-2 font-medium">Vendedor</th>
                <th className="pb-2 text-right font-medium">Qtd</th>
                <th className="pb-2 text-right font-medium">Faturamento</th>
                <th className="w-40 pb-2 pl-4 font-medium">Atingimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26262c]">
              {funil.ranking_metas.vendedores.map((v) => {
                const at = v.atingimento_valor_pct;
                return (
                  <tr key={v.owner_id} className="text-[#d4d4d8]">
                    <td className="py-2">{v.vendedor}</td>
                    <td className="py-2 text-right tabular-nums">{num(v.qtd)}</td>
                    <td className="py-2 text-right font-semibold tabular-nums text-[#f4f4f5]">
                      {brl(v.valor)}
                    </td>
                    <td className="py-2 pl-4">
                      {at == null ? (
                        <span className="text-xs text-[#8a8a93]">sem meta</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <ProgressBar pct={at} barClass={attainmentBar(at)} />
                          <span className={`shrink-0 text-xs tabular-nums ${attainmentText(at)}`}>
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
                  <td colSpan={4} className="py-6 text-center text-[#8a8a93]">
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
              <tr className="text-left text-xs uppercase tracking-wider text-[#8a8a93]">
                <th className="pb-2 font-medium">Vendedor</th>
                <th className="pb-2 text-right font-medium">Qtd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26262c]">
              {[...m.reunioes_realizadas_por_vendedor]
                .sort((a, b) => b.qtd - a.qtd)
                .map((r) => (
                  <tr key={r.owner_id} className="text-[#d4d4d8]">
                    <td className="py-2">{r.vendedor}</td>
                    <td className="py-2 text-right font-semibold tabular-nums text-[#f4f4f5]">
                      {num(r.qtd)}
                    </td>
                  </tr>
                ))}
              {m.reunioes_realizadas_por_vendedor.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-6 text-center text-[#8a8a93]">
                    Sem dados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}
