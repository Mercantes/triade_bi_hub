import type { VendaDetalhe } from "@/lib/types";
import { brl, dateTimeShort, num } from "@/lib/format";
import { Card, SectionTitle } from "./ui";

export function VendasTable({ vendas }: { vendas: VendaDetalhe[] }) {
  const total = vendas.reduce((s, v) => s + v.valor, 0);

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>Vendas fechadas no período</SectionTitle>
        <span className="text-xs text-[#8a8a93]">
          <span className="font-semibold text-[#f4f4f5]">{num(vendas.length)}</span>{" "}
          deals ·{" "}
          <span className="font-semibold text-[#22c55e]">{brl(total)}</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-[#8a8a93]">
              <th className="pb-2 font-medium">Cliente</th>
              <th className="pb-2 font-medium">Vendedora</th>
              <th className="pb-2 pr-4 text-right font-medium">Valor</th>
              <th className="pb-2 pl-2 font-medium">Fechado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#26262c]">
            {vendas.map((v, i) => (
              <tr key={i} className="text-[#d4d4d8]">
                <td className="max-w-xs truncate py-2 pr-4 font-medium text-[#f4f4f5]">
                  {v.cliente}
                </td>
                <td className="py-2 pr-4">{v.vendedor}</td>
                <td className="whitespace-nowrap py-2 pr-4 text-right font-semibold tabular-nums text-[#22c55e]">
                  {brl(v.valor)}
                </td>
                <td className="whitespace-nowrap py-2 tabular-nums text-[#8a8a93]">
                  {dateTimeShort(v.fechado_em)}
                </td>
              </tr>
            ))}
            {vendas.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[#8a8a93]">
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
