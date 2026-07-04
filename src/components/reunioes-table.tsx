"use client";

import { useMemo, useState } from "react";
import type { ReuniaoDetalhe } from "@/lib/types";
import { dateTimeShort } from "@/lib/format";
import { Card, SectionTitle } from "./ui";

function statusBadge(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("realiz"))
    return "bg-[#22c55e]/15 text-[#22c55e]";
  if (s.includes("agend"))
    return "bg-[#eab308]/15 text-[#eab308]";
  if (s.includes("no-show") || s.includes("no show"))
    return "bg-[#e50914]/15 text-[#e50914]";
  return "bg-[#e5e7eb] text-[#374151]";
}

export function ReunioesTable({
  reunioes,
  vendedorLabel = "Vendedor",
  clienteLabel = "Cliente",
}: {
  reunioes: ReuniaoDetalhe[];
  vendedorLabel?: string;
  clienteLabel?: string;
}) {
  // Tabs geradas a partir dos status presentes nos dados.
  const tabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of reunioes) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    return [
      { label: "Todas", value: "Todas", count: reunioes.length },
      ...[...counts.entries()].map(([value, count]) => ({
        label: value,
        value,
        count,
      })),
    ];
  }, [reunioes]);

  const [filtro, setFiltro] = useState("Todas");

  const linhas = useMemo(
    () =>
      filtro === "Todas"
        ? reunioes
        : reunioes.filter((r) => r.status === filtro),
    [reunioes, filtro],
  );

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>Reuniões do mês</SectionTitle>
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setFiltro(t.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filtro === t.value
                  ? "bg-[#e50914] text-white"
                  : "bg-[#ffffff] text-[#6b7280] hover:text-[#111827]"
              }`}
            >
              {t.label} <span className="opacity-70">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-[#6b7280]">
              <th className="pb-2 font-medium">{clienteLabel}</th>
              <th className="pb-2 font-medium">{vendedorLabel}</th>
              <th className="pb-2 font-medium">Marcada em</th>
              <th className="pb-2 font-medium">Realizada em</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            {linhas.map((r, i) => (
              <tr key={i} className="text-[#374151]">
                <td className="max-w-xs truncate py-2 pr-4 font-medium text-[#111827]">
                  {r.cliente}
                </td>
                <td className="py-2 pr-4">{r.vendedor}</td>
                <td className="whitespace-nowrap py-2 pr-4 tabular-nums text-[#6b7280]">
                  {dateTimeShort(r.marcada_em)}
                </td>
                <td className="whitespace-nowrap py-2 pr-4 tabular-nums text-[#6b7280]">
                  {dateTimeShort(r.realizada_em)}
                </td>
                <td className="py-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(
                      r.status,
                    )}`}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#6b7280]">
                  Nenhuma reunião neste filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
