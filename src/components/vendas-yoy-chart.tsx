"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
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
const PALETA = ["#22c55e", "#2dd4bf", "#8a8a93", "#52525b"];

type Metrica = "faturamento" | "vendas";

export function VendasYoYChart({ dados }: { dados: VendaMensal[] }) {
  const [metrica, setMetrica] = useState<Metrica>("faturamento");

  const { anos, chartData, corPorAno } = useMemo(() => {
    const anosSet = Array.from(new Set(dados.map((d) => d.ano))).sort((a, b) => a - b);
    // Cor: ano mais recente recebe a cor mais forte.
    const cor: Record<number, string> = {};
    [...anosSet].reverse().forEach((ano, i) => {
      cor[ano] = PALETA[i] ?? "#52525b";
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
                  : "bg-[#16161a] text-[#8a8a93] hover:text-[#f4f4f5]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {anos.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#71717a]">Sem dados.</p>
      ) : (
        <div className="h-[280px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f24" vertical={false} />
              <XAxis
                dataKey="mes"
                stroke="#52525b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#52525b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={metrica === "faturamento" ? 60 : 40}
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
                formatter={(v, n) => [fmt(Number(v)), String(n)]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} iconType="plainline" />
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
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
