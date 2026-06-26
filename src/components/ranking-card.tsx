import type { ReactNode } from "react";
import { Card } from "./ui";
import { Icon, type IconName } from "./icons";

const AVATAR_COLORS = [
  "#e50914",
  "#a855f7",
  "#3b82f6",
  "#06b6d4",
  "#22c55e",
  "#eab308",
  "#f97316",
];

function Avatar({ name, i }: { name: string; i: number }) {
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export interface RankRow {
  vendedor: string;
  value: number;
}

export function RankingCard({
  title,
  icon,
  accent,
  total,
  sub,
  columnLabel,
  rows,
  formatValue,
  averageLabel,
  averageOverride,
  unavailable = false,
  unavailableHint,
}: {
  title: string;
  icon: IconName;
  /** Cor de destaque do badge do ícone (hex). */
  accent: string;
  total: ReactNode;
  sub?: ReactNode;
  columnLabel: string;
  rows: RankRow[];
  formatValue: (v: number) => string;
  averageLabel: string;
  /** Quando definido, sobrescreve a média calculada (ex.: total/qtd). */
  averageOverride?: number;
  /** Quando true, oculta os valores (mostra "—") — ex.: métrica que só vale por mês. */
  unavailable?: boolean;
  /** Texto exibido no lugar do ranking quando unavailable. */
  unavailableHint?: string;
}) {
  const sorted = [...rows].sort((a, b) => b.value - a.value).slice(0, 5);
  const avg =
    averageOverride ??
    (rows.length ? rows.reduce((s, r) => s + r.value, 0) / rows.length : 0);

  return (
    <Card className="flex min-h-[300px] flex-col p-5">
      {/* Título */}
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#a1a1aa]">
        {title}
        <Icon name="info" className="h-3.5 w-3.5 text-[#52525b]" />
      </div>

      {/* Badge + número */}
      <div className="mt-4 flex flex-col items-center">
        <span
          className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ background: `${accent}1f`, color: accent }}
        >
          <Icon name={icon} />
        </span>
        <p className="text-[28px] font-extrabold leading-none tabular-nums text-[#f4f4f5]">
          {unavailable ? "—" : total}
        </p>
        {!unavailable && sub && (
          <div className="mt-2 text-center text-[11px]">{sub}</div>
        )}
      </div>

      {/* Cabeçalho da coluna */}
      <div className="mt-3 flex items-center justify-end border-b border-[#26262c] pb-1.5 text-[10px] lowercase tracking-wide text-[#71717a]">
        {columnLabel}
      </div>

      {/* Ranking */}
      <ul className="mt-2 flex-1 space-y-2 py-0.5">
        {unavailable ? (
          <li className="px-2 py-4 text-center text-[11px] leading-relaxed text-[#71717a]">
            {unavailableHint ?? "Disponível por mês."}
          </li>
        ) : (
          <>
            {sorted.map((r, i) => (
              <li key={r.vendedor} className="flex items-center gap-2 text-[13px]">
                <Avatar name={r.vendedor} i={i} />
                <span className="truncate text-[#d4d4d8]">{r.vendedor}</span>
                <span className="ml-auto shrink-0 font-semibold tabular-nums text-[#f4f4f5]">
                  {formatValue(r.value)}
                </span>
              </li>
            ))}
            {sorted.length === 0 && (
              <li className="py-2 text-center text-[11px] text-[#71717a]">
                Sem dados.
              </li>
            )}
          </>
        )}
      </ul>

      {/* Rodapé média */}
      <div className="mt-2 flex items-end justify-between border-t border-[#26262c] pt-2">
        <span className="text-[11px] leading-tight text-[#71717a]">
          {averageLabel}
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-[#2dd4bf]">
          {unavailable ? "—" : formatValue(Math.round(avg))}
        </span>
      </div>
    </Card>
  );
}
