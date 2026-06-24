/** Utilitários de formatação (pt-BR). */

const currencyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFmt = new Intl.NumberFormat("pt-BR");

/** Moeda BRL: R$ 1.234,56 */
export function brl(value: number | null | undefined): string {
  return currencyFmt.format(value ?? 0);
}

/** Inteiro/decimal pt-BR. */
export function num(value: number | null | undefined): string {
  if (value == null) return "—";
  return numberFmt.format(value);
}

/** Percentual com 1 casa decimal: 75,6% */
export function pct(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

/** Mostra "—" quando o valor não faz sentido (0 ou null). */
export function brlOrDash(value: number | null | undefined): string {
  if (value == null || value === 0) return "—";
  return currencyFmt.format(value);
}

/** Data/hora ISO -> pt-BR (ex.: 24/06/2026 11:07). */
export function dateTimeBR(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
