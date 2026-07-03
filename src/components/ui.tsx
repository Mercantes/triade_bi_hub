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
      className={`rounded-xl border border-[#e5e7eb] bg-[#ffffff] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6b7280]">
      {children}
    </h2>
  );
}

/** Card de KPI: rótulo pequeno em cima, número grande embaixo. */
export function StatCard({
  label,
  value,
  valueClassName = "text-[#111827]",
  hint,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  hint?: ReactNode;
}) {
  return (
    <Card className="flex min-h-[116px] flex-col p-5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#6b7280]">
        {label}
      </p>
      <p
        className={`mt-1.5 whitespace-nowrap text-2xl font-bold tabular-nums ${valueClassName}`}
      >
        {value}
      </p>
      {hint && <p className="mt-auto pt-1 text-xs text-[#6b7280]">{hint}</p>}
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
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
      <div
        className={`h-full rounded-full ${barClass}`}
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
      />
    </div>
  );
}
