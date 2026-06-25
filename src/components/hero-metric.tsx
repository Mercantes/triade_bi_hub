"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriePonto } from "@/lib/pace";
import { computePace } from "@/lib/pace";
import { ritmoColor } from "@/lib/colors";
import { brl, num } from "@/lib/format";
import { displayDate } from "@/lib/dates";
import { Card } from "./ui";
import { Icon } from "./icons";

function mesNome(fromISO: string): string {
  const [y, m] = fromISO.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long" });
}

function tickDia(iso: string): string {
  const [, m, d] = iso.split("-");
  const meses = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${Number(d)} ${meses[Number(m)] ?? ""}`;
}

export function HeroMetric({
  label,
  metaNoun,
  value,
  meta,
  serie,
  fromISO,
  format = "number",
  mostrarMeta = true,
}: {
  label: string;
  metaNoun: string;
  value: number;
  meta: number;
  serie: SeriePonto[];
  fromISO: string;
  format?: "number" | "currency";
  mostrarMeta?: boolean;
}) {
  const fmt = (v: number) => (format === "currency" ? brl(v) : num(v));
  const pace = computePace(meta, fromISO, value);
  const ritmo = pace.ritmoPct;
  const temMeta = mostrarMeta && meta > 0 && ritmo != null;
  const diffAbs = temMeta ? Math.abs(Math.round(100 - ritmo!)) : 0;
  const acima = temMeta && ritmo! >= 100;

  return (
    <Card className="p-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        {/* Lado esquerdo */}
        <div className="flex flex-col justify-center">
          <p className="text-4xl font-extrabold tracking-tight tabular-nums text-[#f4f4f5]">
            {fmt(value)}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[#a1a1aa]">
            {label}
            <Icon name="info" className="h-3.5 w-3.5 text-[#52525b]" />
          </p>

          {temMeta ? (
            <>
              <p className="mt-3 text-xs text-[#71717a]">
                Meta de {metaNoun} para {mesNome(fromISO)}:{" "}
                <span className="font-semibold text-[#2dd4bf]">{fmt(meta)}</span>
              </p>
              <div className="mt-1.5 flex items-start gap-1.5">
                <Icon
                  name={acima ? "trend-up" : "trend-down"}
                  className={`mt-0.5 h-4 w-4 shrink-0 ${ritmoColor(ritmo!)}`}
                />
                <p className="text-xs leading-relaxed">
                  <span className={`font-semibold ${ritmoColor(ritmo!)}`}>
                    {diffAbs}% {acima ? "acima" : "abaixo"} do ritmo
                  </span>{" "}
                  <span className="text-[#71717a]">
                    para bater a meta no mês — esperado até hoje:{" "}
                    <span className="text-[#d4d4d8]">
                      {fmt(Math.round(pace.esperadoAteHoje))}
                    </span>
                  </span>
                </p>
              </div>
            </>
          ) : mostrarMeta ? (
            <p className="mt-3 text-xs text-[#71717a]">Sem meta definida</p>
          ) : null}
        </div>

        {/* Lado direito: gráfico completo */}
        <div className="h-[240px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serie} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${metaNoun}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f24" vertical={false} />
              <XAxis
                dataKey="dia"
                tickFormatter={tickDia}
                stroke="#52525b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                stroke="#52525b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v) => fmt(Number(v))}
              />
              <Tooltip
                contentStyle={{
                  background: "#16161a",
                  border: "1px solid #26262c",
                  borderRadius: 8,
                  color: "#f4f4f5",
                  fontSize: 12,
                }}
                labelFormatter={(l) => displayDate(String(l))}
                formatter={(v, n) => [fmt(Number(v)), n === "real" ? label : "Meta"]}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
                iconType="plainline"
                formatter={(val) => (val === "real" ? label : "Meta")}
              />
              {temMeta && (
                <Line
                  type="monotone"
                  dataKey="pace"
                  name="pace"
                  stroke="#52525b"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
              <Area
                type="monotone"
                dataKey="real"
                name="real"
                stroke="#22c55e"
                strokeWidth={2}
                fill={`url(#grad-${metaNoun})`}
                dot={{ r: 2, fill: "#22c55e", strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
