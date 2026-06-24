import { computePace } from "@/lib/pace";
import { ritmoColor } from "@/lib/colors";
import { brl, num } from "@/lib/format";

/** Sub-linha de pace para os cards de ranking: "▼ 28% do previsto · Meta mês: 1.500". */
export function PaceSub({
  value,
  meta,
  fromISO,
  format = "number",
}: {
  value: number;
  meta: number;
  fromISO: string;
  format?: "number" | "currency";
}) {
  const fmt = (v: number) => (format === "currency" ? brl(v) : num(v));

  if (!(meta > 0)) {
    return <span className="text-[#8a8a93]">Meta mês: —</span>;
  }

  const { ritmoPct } = computePace(meta, fromISO, value);
  if (ritmoPct == null) {
    return <span className="text-[#8a8a93]">Meta mês: {fmt(meta)}</span>;
  }

  const acima = ritmoPct >= 100;
  const diff = Math.abs(Math.round(100 - ritmoPct));

  return (
    <span>
      <span className={`font-medium ${ritmoColor(ritmoPct)}`}>
        {acima ? "▲" : "▼"} {diff}% do previsto
      </span>
      <span className="text-[#8a8a93]"> · Meta mês: {fmt(meta)}</span>
    </span>
  );
}
