import type { VendaDetalhe } from "@/lib/types";
import { brl, dateTimeShort, num } from "@/lib/format";
import { Card, SectionTitle } from "./ui";

export function VendasTable({ vendas }: { vendas: VendaDetalhe[] }) {
  const total = vendas.reduce((s, v) => s + v.valor, 0);

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>Vendas fechadas no período</SectionTitle>
        <span className="text-xs text-[#6b7280]">
          <span className="font-semibold text-[#111827]">{num(vendas.length)}</span>{" "}
          deals ·{" "}
          <span className="font-semibold text-[#22c55e]">{brl(total)}</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-[#6b7280]">
              <th className="pb-2 font-medium">Cliente</th>
              <th className="pb-2 font-medium">Pré-vendedora</th>
              <th className="pb-2 font-medium">Vendedora</th>
              <th className="pb-2 font-medium">Origem</th>
              <th className="pb-2 pr-4 text-right font-medium">Valor</th>
              <th className="pb-2 pl-2 font-medium">Fechado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            {vendas.map((v, i) => (
              <tr key={i} className="text-[#374151]">
                <td className="max-w-xs truncate py-2 pr-4 font-medium text-[#111827]">
                  {v.cliente}
                </td>
                <td className="py-2 pr-4">{v.pre_vendedora || "—"}</td>
                <td className="py-2 pr-4">{v.vendedor}</td>
                <td className="py-2 pr-4 text-[#6b7280]">{v.origem}</td>
                <td className="whitespace-nowrap py-2 pr-4 text-right font-semibold tabular-nums text-[#22c55e]">
                  {brl(v.valor)}
                </td>
                <td className="whitespace-nowrap py-2 tabular-nums text-[#6b7280]">
                  {dateTimeShort(v.fechado_em)}
                </td>
              </tr>
            ))}
            {vendas.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#6b7280]">
                  Nenhum deal fechado neste período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
