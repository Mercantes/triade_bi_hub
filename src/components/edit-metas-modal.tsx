"use client";

import { useEffect, useState } from "react";
import type { MetasEdit } from "@/lib/types";

interface Campo {
  key: keyof MetasEdit;
  label: string;
  desc: string;
  tipo: "num" | "moeda" | "percent";
}

const CAMPOS: Campo[] = [
  {
    key: "meta_leads",
    label: "Meta de Leads Abertos",
    desc: "Total de leads que o time vai abrir no mês (primeiro contato humano)",
    tipo: "num",
  },
  {
    key: "meta_reun_marcadas",
    label: "Meta de Reuniões Marcadas",
    desc: "Total de reuniões agendadas no mês",
    tipo: "num",
  },
  {
    key: "meta_reun_realizadas",
    label: "Meta de Reuniões Realizadas",
    desc: "Total de reuniões efetivamente realizadas no mês",
    tipo: "num",
  },
  {
    key: "meta_vendas",
    label: "Meta de Vendas",
    desc: "Total de negócios ganhos no mês",
    tipo: "num",
  },
  {
    key: "meta_ticket",
    label: "Meta de Ticket Médio",
    desc: "Ticket médio esperado por venda no mês",
    tipo: "moeda",
  },
  {
    key: "meta_faturamento",
    label: "Meta de Faturamento",
    desc: "Faturamento total esperado no mês",
    tipo: "moeda",
  },
  {
    key: "meta_taxa_fechamento",
    label: "Meta de Taxa de Fechamento",
    desc: "Percentual de reuniões realizadas que viram venda no mês",
    tipo: "percent",
  },
];

function parseNum(s: string): number {
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function EditMetasModal({
  mes,
  inicial,
  temOverride,
  onSave,
  onReset,
  onClose,
}: {
  mes: string;
  inicial: MetasEdit;
  temOverride: boolean;
  onSave: (m: MetasEdit) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(CAMPOS.map((c) => [c.key, String(inicial[c.key] ?? 0)])),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    const out = {} as MetasEdit;
    for (const c of CAMPOS) out[c.key] = parseNum(valores[c.key]);
    onSave(out);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="my-8 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#26262c] bg-[#0d0d0f] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header vermelho */}
        <div className="flex items-center justify-between bg-[#e50914] px-6 py-4">
          <h2 className="text-lg font-bold text-white">Metas {mes}</h2>
          <button
            onClick={onClose}
            className="text-white/80 transition-colors hover:text-white"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="mb-5 text-sm text-[#8a8a93]">
            Estas metas mensais são exibidas nos cards do Dashboard e usadas no
            cálculo de ritmo/pace. As alterações ficam salvas neste navegador.
          </p>

          <div className="space-y-3">
            {CAMPOS.map((c) => (
              <div
                key={c.key}
                className="flex items-center justify-between gap-4 rounded-xl border border-[#26262c] bg-[#16161a] p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[#f4f4f5]">{c.label}</p>
                  <p className="mt-0.5 text-xs text-[#8a8a93]">{c.desc}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#26262c] bg-[#0d0d0f] px-3 py-2 focus-within:border-[#e50914]">
                  {c.tipo === "moeda" && (
                    <span className="text-sm text-[#8a8a93]">R$</span>
                  )}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={valores[c.key]}
                    onChange={(e) =>
                      setValores((v) => ({ ...v, [c.key]: e.target.value }))
                    }
                    className="w-24 bg-transparent text-right text-sm font-semibold text-[#f4f4f5] tabular-nums outline-none"
                  />
                  {c.tipo === "percent" && (
                    <span className="text-sm text-[#8a8a93]">%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between gap-3 border-t border-[#26262c] px-6 py-4">
          <button
            onClick={onReset}
            disabled={!temOverride}
            className="text-xs font-medium text-[#8a8a93] transition-colors hover:text-[#f4f4f5] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Restaurar padrão
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#d4d4d8] transition-colors hover:bg-[#1f1f24]"
            >
              Fechar
            </button>
            <button
              onClick={submit}
              className="rounded-lg bg-[#e50914] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c40810]"
            >
              Salvar metas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
