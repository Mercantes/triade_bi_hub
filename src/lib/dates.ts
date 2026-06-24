/** Utilitários de período (datas no formato YYYY-MM-DD, horário local). */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface Range {
  from: string;
  to: string;
}

/** Primeiro dia do mês corrente até hoje (padrão ao abrir). */
export function currentMonthRange(): Range {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: toISODate(first), to: toISODate(now) };
}

/** Últimos N meses até hoje. */
export function lastMonthsRange(months: number): Range {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
  return { from: toISODate(from), to: toISODate(now) };
}

export const SHORTCUTS: { label: string; range: () => Range }[] = [
  { label: "Mês atual", range: currentMonthRange },
  { label: "Últimos 3 meses", range: () => lastMonthsRange(3) },
  { label: "Últimos 12 meses", range: () => lastMonthsRange(12) },
];

/** Nome do mês (capitalizado) a partir de uma data ISO. Ex.: "Junho". */
export function monthLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  const nome = d.toLocaleDateString("pt-BR", { month: "long" });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

/** dd/mm/aaaa para exibição. */
export function displayDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
