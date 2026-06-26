/** Helpers de cor por threshold (retornam classes Tailwind de texto). */

export const POS = "#22c55e";
export const WARN = "#eab308";
export const NEG = "#e50914";

/** Taxa de comparecimento: verde ≥70, amarelo 40–69, vermelho <40. */
export function attendanceColor(v: number): string {
  if (v >= 70) return "text-[#22c55e]";
  if (v >= 40) return "text-[#eab308]";
  return "text-[#e50914]";
}

/** Taxa de no-show (inverso do comparecimento): verde ≤30, amarelo 31–60, vermelho >60. */
export function noShowColor(v: number): string {
  if (v <= 30) return "text-[#22c55e]";
  if (v <= 60) return "text-[#eab308]";
  return "text-[#e50914]";
}

/** Ritmo/pace: verde ≥100, amarelo 80–99, vermelho <80. */
export function ritmoColor(pct: number): string {
  if (pct >= 100) return "text-[#22c55e]";
  if (pct >= 80) return "text-[#eab308]";
  return "text-[#e50914]";
}

export function ritmoHex(pct: number): string {
  if (pct >= 100) return POS;
  if (pct >= 80) return WARN;
  return NEG;
}

/** Atingimento de meta: verde ≥100, amarelo 70–99, vermelho <70. */
export function attainmentText(v: number): string {
  if (v >= 100) return "text-[#22c55e]";
  if (v >= 70) return "text-[#eab308]";
  return "text-[#e50914]";
}

/** Atingimento de meta: cor de fundo da barra de progresso. */
export function attainmentBar(v: number): string {
  if (v >= 100) return "bg-[#22c55e]";
  if (v >= 70) return "bg-[#eab308]";
  return "bg-[#e50914]";
}
