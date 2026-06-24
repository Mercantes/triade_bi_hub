import type { Funil, VendedorContagem } from "@/lib/types";
import { num, pct } from "@/lib/format";
import { attendanceColor, attainmentBar, attainmentText } from "@/lib/colors";
import { Card, SectionTitle, StatCard, ProgressBar } from "./ui";
import { FunnelBars } from "./funnel-bars";
import { MotivosDonut } from "./motivos-donut";

/** Junta reuniões marcadas + realizadas por vendedor. */
function mergeSdrMeetings(
  marcadas: VendedorContagem[],
  realizadas: VendedorContagem[],
) {
  const map = new Map<string, { vendedor: string; marcadas: number; realizadas: number }>();
  for (const m of marcadas) {
    map.set(m.vendedor, { vendedor: m.vendedor, marcadas: m.qtd, realizadas: 0 });
  }
  for (const r of realizadas) {
    const entry = map.get(r.vendedor) ?? {
      vendedor: r.vendedor,
      marcadas: 0,
      realizadas: 0,
    };
    entry.realizadas = r.qtd;
    map.set(r.vendedor, entry);
  }
  return [...map.values()].sort((a, b) => b.marcadas - a.marcadas);
}

export function PreVendasPanel({ funil }: { funil: Funil }) {
  const m = funil.metricas;
  const sdrs = mergeSdrMeetings(
    m.reunioes_marcadas_por_vendedor,
    m.reunioes_realizadas_por_vendedor,
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-7">
        <StatCard label="Leads Abertos" value={num(m.leads_abertos)} />
        <StatCard label="Leads para Abrir" value={num(m.leads_para_abrir)} />
        <StatCard label="Reuniões Marcadas" value={num(m.reunioes_marcadas)} />
        <StatCard label="Reuniões Realizadas" value={num(m.reunioes_realizadas)} />
        <StatCard label="No-Show" value={num(m.no_show)} />
        <StatCard
          label="Comparecimento"
          value={pct(m.taxa_comparecimento)}
          valueClassName={attendanceColor(m.taxa_comparecimento)}
        />
        <StatCard
          label="Ativ. Atrasadas"
          value={num(m.atividades_atrasadas)}
          valueClassName={
            m.atividades_atrasadas > 0 ? "text-[#e50914]" : "text-[#f4f4f5]"
          }
        />
      </section>

      {/* Funil + Ranking SDR */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FunnelBars etapas={funil.pipeline_por_etapa.etapas} showValue={false} />

        <Card className="p-5">
          <SectionTitle>Ranking de SDRs por reuniões</SectionTitle>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[#8a8a93]">
                <th className="pb-2 font-medium">Vendedor</th>
                <th className="pb-2 text-right font-medium">Marcadas</th>
                <th className="pb-2 text-right font-medium">Realizadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26262c]">
              {sdrs.map((s) => (
                <tr key={s.vendedor} className="text-[#d4d4d8]">
                  <td className="py-2">{s.vendedor}</td>
                  <td className="py-2 text-right font-semibold tabular-nums text-[#f4f4f5]">
                    {num(s.marcadas)}
                  </td>
                  <td className="py-2 text-right tabular-nums">{num(s.realizadas)}</td>
                </tr>
              ))}
              {sdrs.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-[#8a8a93]">
                    Sem dados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Meta (qtd) + Atividades atrasadas */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle>Ranking com meta (quantidade)</SectionTitle>
          <div className="space-y-3">
            {funil.ranking_metas.vendedores.map((v) => {
              const at = v.atingimento_qtd_pct;
              return (
                <div key={v.owner_id}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="text-[#d4d4d8]">{v.vendedor}</span>
                    <span className="tabular-nums text-[#8a8a93]">
                      <span className="font-semibold text-[#f4f4f5]">{num(v.qtd)}</span>
                      {at == null ? (
                        <span className="ml-2 text-xs">sem meta</span>
                      ) : (
                        <span className={`ml-2 text-xs ${attainmentText(at)}`}>
                          {pct(at)}
                        </span>
                      )}
                    </span>
                  </div>
                  {at != null && (
                    <ProgressBar pct={at} barClass={attainmentBar(at)} />
                  )}
                </div>
              );
            })}
            {funil.ranking_metas.vendedores.length === 0 && (
              <p className="py-6 text-center text-sm text-[#8a8a93]">Sem dados.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle>Atividades atrasadas por SDR</SectionTitle>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[#8a8a93]">
                <th className="pb-2 font-medium">Vendedor</th>
                <th className="pb-2 text-right font-medium">Qtd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26262c]">
              {m.atividades_atrasadas_por_vendedor.map((a) => (
                <tr key={a.owner_id} className="text-[#d4d4d8]">
                  <td className="py-2">{a.vendedor}</td>
                  <td className="py-2 text-right font-semibold tabular-nums text-[#e50914]">
                    {num(a.qtd)}
                  </td>
                </tr>
              ))}
              {m.atividades_atrasadas_por_vendedor.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-6 text-center text-[#22c55e]">
                    Nenhuma atividade atrasada 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Motivos de perda */}
      <section>
        <MotivosDonut motivos={funil.ganhos_perdas.motivos_perda} />
      </section>
    </div>
  );
}
