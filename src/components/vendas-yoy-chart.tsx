"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VendaMensal } from "@/lib/types";
import { brl, num } from "@/lib/format";
import { Card, SectionTitle } from "./ui";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
// Cores da mais recente (verde forte) para as mais antigas (esmaecidas).
const PALETA = ["#22c55e", "#2dd4bf", "#6b7280", "#9ca3af"];

type Metrica = "faturamento" | "vendas";

export function VendasYoYChart({ dados }: { dados: VendaMensal[] }) {
  const [metrica, setMetrica] = useState<Metrica>("faturamento");

  const { anos, chartData, corPorAno } = useMemo(() => {
    const anosSet = Array.from(new Set(dados.map((d) => d.ano))).sort((a, b) => a - b);
    // Cor: ano mais recente recebe a cor mais forte.
    const cor: Record<number, string> = {};
    [...anosSet].reverse().forEach((ano, i) => {
      cor[ano] = PALETA[i] ?? "#9ca3af";
    });
    // Uma linha por mês (Jan..Dez), com uma coluna por ano.
    const rows = MESES.map((mesLabel, i) => {
      const mes = i + 1;
      const row: Record<string, number | string> = { mes: mesLabel };
      for (const ano of anosSet) {
        const reg = dados.find((d) => d.ano === ano && d.mes === mes);
        row[String(ano)] = reg ? reg[metrica] : 0;
      }
      return row;
    });
    return { anos: anosSet, chartData: rows, corPorAno: cor };
  }, [dados, metrica]);

  const fmt = (v: number) => (metrica === "faturamento" ? brl(v) : num(v));

  // Rótulo compacto nos pontos: pula zero; faturamento vira "R$ 12,5k".
  const labelFmt = (v: ReactNode): string => {
    const n = Number(v);
    if (!n) return "";
    if (metrica === "vendas") return String(n);
    return n >= 1000
      ? `R$ ${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`
      : `R$ ${Math.round(n)}`;
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>Vendas ano a ano (mês a mês)</SectionTitle>
        <div className="flex gap-1">
          {(
            [
              ["faturamento", "Faturamento"],
              ["vendas", "Nº de vendas"],
            ] as [Metrica, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setMetrica(val)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                metrica === val
                  ? "bg-[#e50914] text-white"
                  : "bg-[#ffffff] text-[#6b7280] hover:text-[#111827]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {anos.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#9ca3af]">Sem dados.</p>
      ) : (
        <div className="h-[280px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="mes"
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={metrica === "faturamento" ? 60 : 40}
                tickFormatter={(v) => fmt(Number(v))}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  color: "#111827",
                  fontSize: 12,
                }}
                formatter={(v, n) => [fmt(Number(v)), String(n)]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#4b5563" }} iconType="plainline" />
              {anos.map((ano) => (
                <Line
                  key={ano}
                  type="monotone"
                  dataKey={String(ano)}
                  name={String(ano)}
                  stroke={corPorAno[ano]}
                  strokeWidth={2}
                  dot={{ r: 2, fill: corPorAno[ano], strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                >
                  <LabelList
                    dataKey={String(ano)}
                    position="top"
                    offset={8}
                    formatter={labelFmt}
                    style={{ fontSize: 9, fill: corPorAno[ano], fontWeight: 600 }}
                  />
                </Line>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
