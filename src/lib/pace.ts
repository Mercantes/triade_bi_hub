import type { PontoSerie, SerieKey } from "./types";
import { toISODate } from "./dates";

/** Conta dias úteis (seg–sex) entre duas datas, inclusivo. */
export function businessDays(start: Date, end: Date): number {
  if (end < start) return 0;
  let count = 0;
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (d <= last) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export interface PaceResult {
  diasUteisTotais: number;
  diasUteisDecorridos: number;
  esperadoAteHoje: number;
  realizado: number;
  /** realizado / esperado * 100 (null se esperado = 0). */
  ritmoPct: number | null;
}

/**
 * Calcula o pace de uma métrica no FRONT:
 * - dias úteis totais = seg–sex do mês de `from`
 * - dias úteis decorridos = seg–sex de `from` até hoje (limitado a hoje/fim do mês)
 * - esperado até hoje = meta / totais * decorridos
 */
export function computePace(
  meta: number,
  fromISO: string,
  realizado: number,
  now = new Date(),
): PaceResult {
  const from = parseISO(fromISO);
  const monthStart = new Date(from.getFullYear(), from.getMonth(), 1);
  const monthEnd = new Date(from.getFullYear(), from.getMonth() + 1, 0);

  const totais = businessDays(monthStart, monthEnd);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const decorridoEnd = today < monthEnd ? today : monthEnd;
  const decorridoStart = from < monthStart ? monthStart : from;
  const decorridos =
    decorridoEnd < decorridoStart ? 0 : businessDays(decorridoStart, decorridoEnd);

  const esperadoAteHoje = totais > 0 ? (meta / totais) * decorridos : 0;
  const ritmoPct = esperadoAteHoje > 0 ? (realizado / esperadoAteHoje) * 100 : null;

  return {
    diasUteisTotais: totais,
    diasUteisDecorridos: decorridos,
    esperadoAteHoje,
    realizado,
    ritmoPct,
  };
}

export interface SeriePonto {
  dia: string;
  real: number;
  pace: number;
}

/**
 * Monta os dados do gráfico: linha cheia (acumulado real) + linha de pace
 * (meta linear distribuída pelos dias úteis do mês).
 */
export function buildChartSeries(
  serie: PontoSerie[],
  key: SerieKey,
  meta: number,
  fromISO: string,
): SeriePonto[] {
  const from = parseISO(fromISO);
  const monthStart = new Date(from.getFullYear(), from.getMonth(), 1);
  const monthEnd = new Date(from.getFullYear(), from.getMonth() + 1, 0);
  const totais = businessDays(monthStart, monthEnd);
  const passoPorDiaUtil = totais > 0 ? meta / totais : 0;

  return serie.map((p) => {
    const dia = parseISO(p.dia);
    const decorridos =
      dia < monthStart
        ? 0
        : businessDays(monthStart, dia < monthEnd ? dia : monthEnd);
    return {
      dia: p.dia,
      real: p[key],
      pace: Math.round(passoPorDiaUtil * decorridos),
    };
  });
}

/** Atalho: data de hoje em ISO (para limites). */
export function todayISO(): string {
  return toISODate(new Date());
}
