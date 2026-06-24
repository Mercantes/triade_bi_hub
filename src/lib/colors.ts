/** Helpers de cor por threshold (retornam classes Tailwind de texto). */

/** Taxa de comparecimento: verde ≥70, amarelo 40–69, vermelho <40. */
export function attendanceColor(v: number): string {
  if (v >= 70) return "text-[#22c55e]";
  if (v >= 40) return "text-[#eab308]";
  return "text-[#e50914]";
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
