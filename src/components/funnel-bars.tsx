import type { Etapa } from "@/lib/types";
import { brl, num } from "@/lib/format";
import { Card, SectionTitle } from "./ui";

export function FunnelBars({
  etapas,
  showValue,
}: {
  etapas: Etapa[];
  showValue: boolean;
}) {
  const ordered = [...etapas].sort((a, b) => a.order - b.order);
  const maxQtd = Math.max(1, ...ordered.map((e) => e.qtd));

  return (
    <Card className="p-5">
      <SectionTitle>Funil por etapa</SectionTitle>
      <div className="space-y-3">
        {ordered.map((e) => (
          <div key={e.stage_id}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate text-[#d4d4d8]">{e.stage_name}</span>
              <span className="shrink-0 tabular-nums text-[#8a8a93]">
                <span className="font-semibold text-[#f4f4f5]">{num(e.qtd)}</span>
                {showValue && e.valor > 0 && (
                  <span className="ml-2 text-xs">{brl(e.valor)}</span>
                )}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#26262c]">
              <div
                className="h-full rounded-full bg-[#e50914]"
                style={{ width: `${(e.qtd / maxQtd) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
