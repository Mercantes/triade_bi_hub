"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { MotivoPerda } from "@/lib/types";
import { num } from "@/lib/format";
import { Card, SectionTitle } from "./ui";

const COLORS = [
  "#e50914",
  "#f97316",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#06b6d4",
  "#6366f1",
  "#a855f7",
  "#64748b",
];

function shorten(s: string, max = 32): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function MotivosDonut({ motivos }: { motivos: MotivoPerda[] }) {
  const sorted = [...motivos].sort((a, b) => b.qtd - a.qtd);
  const top = sorted.slice(0, 8);
  const rest = sorted.slice(8);
  const restQtd = rest.reduce((s, m) => s + m.qtd, 0);

  const data = [
    ...top.map((m) => ({ name: shorten(m.motivo), full: m.motivo, qtd: m.qtd })),
    ...(restQtd > 0 ? [{ name: "Outros", full: "Outros", qtd: restQtd }] : []),
  ];

  const total = data.reduce((s, d) => s + d.qtd, 0);

  return (
    <Card className="p-5">
      <SectionTitle>Motivos de perda</SectionTitle>
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-[#8a8a93]">Sem dados.</p>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="qtd"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                stroke="#16161a"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#16161a",
                  border: "1px solid #26262c",
                  borderRadius: 8,
                  color: "#f4f4f5",
                }}
                formatter={(value, _name, item) => {
                  const full =
                    (item as { payload?: { full?: string } } | undefined)?.payload
                      ?.full ?? "";
                  return [
                    `${num(Number(value))} (${(
                      (Number(value) / total) *
                      100
                    ).toFixed(1)}%)`,
                    full,
                  ];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#8a8a93" }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
