import type { MotivoPerda } from "@/lib/types";
import { num } from "@/lib/format";
import { Card, SectionTitle } from "./ui";

function shorten(s: string, max = 40): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function MotivosBars({
  motivos,
  limit = 12,
}: {
  motivos: MotivoPerda[];
  limit?: number;
}) {
  // Ordena e, se houver mais motivos que o limite, agrupa o excedente em
  // "Outros (N)" — assim a soma das barras sempre bate com o total de perdas.
  const ordenados = [...motivos].sort((a, b) => b.qtd - a.qtd);
  const sorted =
    ordenados.length > limit
      ? [
          ...ordenados.slice(0, limit - 1),
          {
            motivo: `Outros (${ordenados.length - (limit - 1)})`,
            qtd: ordenados
              .slice(limit - 1)
              .reduce((s, m) => s + m.qtd, 0),
            valor: 0,
          },
        ]
      : ordenados;
  const max = Math.max(1, ...sorted.map((m) => m.qtd));

  return (
    <Card className="p-5">
      <SectionTitle>Motivos de perda</SectionTitle>
      {sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#9ca3af]">Sem dados.</p>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((m) => (
            <div key={m.motivo} className="flex items-center gap-3 text-sm">
              <span
                className="w-44 shrink-0 truncate text-right text-xs text-[#4b5563]"
                title={m.motivo}
              >
                {shorten(m.motivo)}
              </span>
              <div className="h-5 flex-1">
                <div
                  className="flex h-full items-center justify-end rounded bg-[#e50914]/80 px-2"
                  style={{ width: `${Math.max((m.qtd / max) * 100, 4)}%` }}
                >
                  <span className="text-[11px] font-semibold tabular-nums text-white">
                    {num(m.qtd)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
