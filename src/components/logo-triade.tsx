/**
 * Logo da Tríade (ícone "molécula" verde + dourado), recriado em SVG.
 * Reconstrução vetorial — troque por `public/logo-triade.svg|png` (via <img>)
 * se quiser o arquivo oficial com fidelidade total.
 */
export function LogoTriade({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label="Tríade"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Barra que liga os dois círculos verdes (a "ligação") */}
      <line
        x1="52"
        y1="66"
        x2="84"
        y2="40"
        stroke="#0a9d48"
        strokeWidth="20"
        strokeLinecap="round"
      />
      {/* Círculo verde grande (topo direito) */}
      <circle cx="86" cy="38" r="23" fill="#0a9d48" />
      {/* Círculo verde menor (inferior) */}
      <circle cx="50" cy="66" r="16" fill="#0a9d48" />
      {/* Círculo dourado (canto inferior esquerdo) */}
      <circle cx="32" cy="84" r="16" fill="#f6b40a" />
    </svg>
  );
}
