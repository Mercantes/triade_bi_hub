import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-[#26262c] bg-[#16161a] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#8a8a93]">
      {children}
    </h2>
  );
}

/** Card de KPI: rótulo pequeno em cima, número grande embaixo. */
export function StatCard({
  label,
  value,
  valueClassName = "text-[#f4f4f5]",
  hint,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  hint?: ReactNode;
}) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a8a93]">
        {label}
      </p>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums ${valueClassName}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-[#8a8a93]">{hint}</p>}
    </Card>
  );
}

/** Barra de progresso (atingimento de meta). */
export function ProgressBar({
  pct,
  barClass,
}: {
  pct: number;
  barClass: string;
}) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#26262c]">
      <div
        className={`h-full rounded-full ${barClass}`}
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
      />
    </div>
  );
}
