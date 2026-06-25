"use client";

import { useEffect, useMemo, useState } from "react";
import type { FunilNome, MetaVendedorEdit, Usuario } from "@/lib/types";

interface Coluna {
  key: keyof MetaVendedorEdit;
  label: string;
  prefix?: string;
  suffix?: string;
}

interface Grupo {
  titulo: string;
  cols: Coluna[];
}

const G_PRE: Grupo = {
  titulo: "Pré-vendas",
  cols: [
    { key: "meta_leads", label: "Leads" },
    { key: "meta_reun_marcadas", label: "Reun. Marc." },
    { key: "meta_reun_realizadas", label: "Reun. Real." },
  ],
};

const G_VENDAS: Grupo = {
  titulo: "Vendas",
  cols: [
    { key: "meta_vendas", label: "Vendas" },
    { key: "meta_ticket", label: "Ticket", prefix: "R$" },
    { key: "meta_faturamento", label: "Faturam.", prefix: "R$" },
    { key: "meta_taxa_fechamento", label: "Taxa Fech.", suffix: "%" },
  ],
};

// Seções por funil: Pré-Vendas só pré-venda; Vendas tem as duas.
const GRUPOS: Record<FunilNome, Grupo[]> = {
  "Pre-Vendas": [G_PRE],
  Vendas: [G_PRE, G_VENDAS],
};

const NOMES: Record<FunilNome, string> = {
  "Pre-Vendas": "Pré-Vendas",
  Vendas: "Vendas",
};

function linhaZerada(owner_id: number, vendedor: string): MetaVendedorEdit {
  return {
    owner_id,
    vendedor,
    meta_leads: 0,
    meta_reun_marcadas: 0,
    meta_reun_realizadas: 0,
    meta_vendas: 0,
    meta_ticket: 0,
    meta_faturamento: 0,
    meta_taxa_fechamento: 0,
  };
}

export function EditMetasModal({
  funilNome,
  mes,
  linhasIniciais,
  usuarios,
  salvando,
  salvoOk,
  erro,
  onSave,
  onDirty,
  onClose,
}: {
  funilNome: FunilNome;
  mes: string;
  linhasIniciais: MetaVendedorEdit[];
  usuarios: Usuario[];
  salvando: boolean;
  salvoOk: boolean;
  erro: string | null;
  onSave: (rows: MetaVendedorEdit[]) => void;
  onDirty: () => void;
  onClose: () => void;
}) {
  const grupos = useMemo(() => GRUPOS[funilNome] ?? [G_PRE], [funilNome]);
  const colunas = useMemo(() => grupos.flatMap((g) => g.cols), [grupos]);

  const [rows, setRows] = useState<MetaVendedorEdit[]>(() =>
    linhasIniciais.map((r) => ({ ...r })),
  );
  const [addId, setAddId] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const disponiveis = useMemo(() => {
    const usados = new Set(rows.map((r) => r.owner_id));
    return usuarios.filter((u) => !usados.has(u.owner_id));
  }, [rows, usuarios]);

  function setValor(owner_id: number, key: keyof MetaVendedorEdit, valor: string) {
    const n = Number(valor.replace(",", "."));
    onDirty();
    setRows((prev) =>
      prev.map((r) =>
        r.owner_id === owner_id
          ? { ...r, [key]: Number.isFinite(n) && n >= 0 ? n : 0 }
          : r,
      ),
    );
  }

  function removerLinha(owner_id: number) {
    onDirty();
    setRows((prev) => prev.filter((r) => r.owner_id !== owner_id));
  }

  function adicionarLinha() {
    const u = usuarios.find((x) => String(x.owner_id) === addId);
    if (!u) return;
    onDirty();
    setRows((prev) => [...prev, linhaZerada(u.owner_id, u.nome)]);
    setAddId("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="my-8 flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#26262c] bg-[#0d0d0f] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header vermelho */}
        <div className="flex items-center justify-between bg-[#e50914] px-6 py-4">
          <h2 className="text-lg font-bold text-white">
            Metas {mes} — {NOMES[funilNome]}
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 transition-colors hover:text-white"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-auto px-6 py-5">
          <p className="mb-4 text-sm text-[#8a8a93]">
            Metas mensais por vendedor (gravadas na aba <code>metas</code> do
            Sheets). Edite os valores, adicione ou remova vendedores.
          </p>

          <table className="w-full text-sm">
            <thead>
              {/* Linha de grupos */}
              <tr className="text-[10px] uppercase tracking-wider text-[#8a8a93]">
                <th className="pb-1 pr-3" rowSpan={2}>
                  <span className="font-medium">Vendedor</span>
                </th>
                {grupos.map((g, gi) => (
                  <th
                    key={g.titulo}
                    colSpan={g.cols.length}
                    className={`pb-1 text-center font-semibold text-[#2dd4bf] ${
                      gi > 0 ? "border-l border-[#26262c]" : ""
                    }`}
                  >
                    {g.titulo}
                  </th>
                ))}
                <th rowSpan={2} />
              </tr>
              {/* Linha de colunas */}
              <tr className="text-[10px] uppercase tracking-wider text-[#71717a]">
                {grupos.map((g, gi) =>
                  g.cols.map((c, ci) => (
                    <th
                      key={c.key}
                      className={`pb-2 px-2 text-right font-medium ${
                        gi > 0 && ci === 0 ? "border-l border-[#26262c]" : ""
                      }`}
                    >
                      {c.label}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26262c]">
              {rows.map((r) => (
                <tr key={r.owner_id} className="text-[#d4d4d8]">
                  <td className="py-2 pr-3 font-medium text-[#f4f4f5]">
                    {r.vendedor}
                  </td>
                  {grupos.map((g, gi) =>
                    g.cols.map((c, ci) => (
                      <td
                        key={c.key}
                        className={`px-2 py-1.5 ${
                          gi > 0 && ci === 0 ? "border-l border-[#26262c]" : ""
                        }`}
                      >
                        <div className="flex items-center justify-end gap-1 rounded-md border border-[#26262c] bg-[#16161a] px-2 py-1 focus-within:border-[#2dd4bf]">
                          {c.prefix && (
                            <span className="text-[11px] text-[#8a8a93]">
                              {c.prefix}
                            </span>
                          )}
                          <input
                            type="text"
                            inputMode="decimal"
                            value={String(r[c.key])}
                            onChange={(e) => setValor(r.owner_id, c.key, e.target.value)}
                            className="w-14 bg-transparent text-right text-sm tabular-nums text-[#f4f4f5] outline-none"
                          />
                          {c.suffix && (
                            <span className="text-[11px] text-[#8a8a93]">
                              {c.suffix}
                            </span>
                          )}
                        </div>
                      </td>
                    )),
                  )}
                  <td className="py-1.5 pl-2 text-right">
                    <button
                      onClick={() => removerLinha(r.owner_id)}
                      className="rounded p-1 text-[#8a8a93] transition-colors hover:bg-[#e50914]/15 hover:text-[#e50914]"
                      aria-label={`Remover ${r.vendedor}`}
                      title="Remover vendedor"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={colunas.length + 2}
                    className="py-6 text-center text-[#8a8a93]"
                  >
                    Nenhum vendedor com meta neste funil/mês.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Adicionar vendedor */}
          <div className="mt-4 flex items-center gap-2">
            <select
              value={addId}
              onChange={(e) => setAddId(e.target.value)}
              disabled={disponiveis.length === 0}
              className="rounded-lg border border-[#26262c] bg-[#16161a] px-3 py-2 text-sm text-[#f4f4f5] outline-none focus:border-[#2dd4bf] disabled:opacity-40"
            >
              <option value="">
                {disponiveis.length ? "Adicionar vendedor…" : "Todos já listados"}
              </option>
              {disponiveis.map((u) => (
                <option key={u.owner_id} value={String(u.owner_id)}>
                  {u.nome}
                </option>
              ))}
            </select>
            <button
              onClick={adicionarLinha}
              disabled={!addId}
              className="rounded-lg border border-[#26262c] px-3 py-2 text-sm font-medium text-[#d4d4d8] transition-colors hover:bg-[#1f1f24] disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Adicionar
            </button>
          </div>

          {salvoOk && !erro && (
            <p className="mt-3 text-sm font-medium text-[#22c55e]">
              ✓ Metas salvas no Sheets.
            </p>
          )}
          {erro && <p className="mt-3 text-sm text-[#e50914]">⚠ {erro}</p>}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-end gap-2 border-t border-[#26262c] px-6 py-4">
          <button
            onClick={onClose}
            disabled={salvando}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#d4d4d8] transition-colors hover:bg-[#1f1f24] disabled:opacity-40"
          >
            Fechar
          </button>
          <button
            onClick={() => onSave(rows)}
            disabled={salvando}
            className="rounded-lg bg-[#e50914] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c40810] disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Salvar metas"}
          </button>
        </div>
      </div>
    </div>
  );
}
