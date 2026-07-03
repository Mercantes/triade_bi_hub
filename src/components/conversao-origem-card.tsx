import type { OrigemConversao } from "@/lib/types";
import { num, pct } from "@/lib/format";
import { Card, SectionTitle } from "./ui";

function shorten(s: string, max = 28): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Cor da taxa de conversão: verde forte / amarelo / vermelho. */
function taxaColor(taxa: number): string {
  if (taxa >= 20) return "text-[#22c55e]";
  if (taxa >= 8) return "text-[#eab308]";
  return "text-[#f87171]";
}

export function ConversaoOrigemCard({
  origens,
  limit = 8,
}: {
  origens: OrigemConversao[];
  limit?: number;
}) {
  // Já vem ordenado por total (volume) do backend; corta no limite.
  const rows = origens.slice(0, limit);
  const max = Math.max(1, ...rows.map((o) => o.total));

  return (
    <Card className="p-5">
      <SectionTitle>Conversão por origem</SectionTitle>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#9ca3af]">Sem dados.</p>
      ) : (
        <>
          {/* Cabeçalho das colunas */}
          <div className="flex items-center gap-3 pb-2 text-[10px] font-medium uppercase tracking-wider text-[#9ca3af]">
            <span className="w-32 shrink-0 text-right">Origem</span>
            <span className="flex-1">Leads gerados</span>
            <span className="w-16 shrink-0 text-right">Vendas</span>
            <span className="w-16 shrink-0 text-right">Conv.</span>
          </div>

          <div className="space-y-2.5">
            {rows.map((o) => (
              <div key={o.origem} className="flex items-center gap-3 text-sm">
                <span
                  className="w-32 shrink-0 truncate text-right text-xs text-[#374151]"
                  title={o.origem}
                >
                  {shorten(o.origem)}
                </span>
                <div className="h-5 flex-1">
                  <div
                    className="flex h-full items-center justify-end rounded bg-[#2dd4bf]/70 px-2"
                    style={{ width: `${Math.max((o.total / max) * 100, 6)}%` }}
                  >
                    <span className="text-[11px] font-semibold tabular-nums text-[#0f172a]">
                      {num(o.total)}
                    </span>
                  </div>
                </div>
                <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums text-[#111827]">
                  {num(o.ganhos)}
                </span>
                <span
                  className={`w-16 shrink-0 text-right text-xs font-semibold tabular-nums ${taxaColor(o.taxa)}`}
                >
                  {pct(o.taxa)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="mt-3 text-[11px] text-[#9ca3af]">
        <span className="text-[#4b5563]">Leads gerados</span> = oportunidades criadas no
        período por canal · <span className="text-[#4b5563]">Vendas</span> = quantas
        fecharam · <span className="text-[#4b5563]">Conv.</span> = vendas ÷ leads
      </p>
    </Card>
  );
}
