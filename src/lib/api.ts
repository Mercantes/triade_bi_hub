import type { BiResponse, MetaVendedorEdit, Usuario } from "./types";
import type { Range } from "./dates";

/**
 * Troca o rótulo técnico "SEM USUARIO" (usuário-placeholder do PipeRun, sem
 * responsável atribuído) por algo apresentável, em qualquer campo de nome.
 * Roda uma vez sobre a resposta inteira do BI — pega rankings, reuniões etc.
 */
function normalizaNomes_(node: unknown): void {
  if (Array.isArray(node)) {
    node.forEach(normalizaNomes_);
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === "string" && /^\s*sem\s*usuario\s*$/i.test(v)) {
        obj[k] = "Não atribuído";
      } else if (v && typeof v === "object") {
        normalizaNomes_(v);
      }
    }
  }
}

/**
 * Busca os dados do BI via proxy interno (/api/bi).
 * `fresh` ignora o cache do proxy (usado após salvar metas, para refletir na hora).
 */
export async function fetchBi(
  range: Range,
  opts?: { fresh?: boolean },
): Promise<BiResponse> {
  const params = new URLSearchParams({ from: range.from, to: range.to });
  if (opts?.fresh) params.set("nocache", "1");
  const res = await fetch(`/api/bi?${params.toString()}`, { cache: "no-store" });

  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignora corpo não-JSON */
    }
    throw new Error(msg);
  }

  const data = (await res.json()) as BiResponse;
  if (!data.ok) {
    throw new Error("O endpoint retornou ok=false");
  }
  normalizaNomes_(data);
  return data;
}

/** Lista de usuários (para o seletor "adicionar vendedor"). */
export async function fetchUsuarios(): Promise<Usuario[]> {
  try {
    const res = await fetch("/api/metas", { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { ok: boolean; usuarios: Usuario[] };
    return data.ok && Array.isArray(data.usuarios) ? data.usuarios : [];
  } catch {
    return [];
  }
}

/**
 * Grava as metas por vendedor (aba `metas`) para um funil + mês.
 * Substitui todas as linhas daquele escopo pelas linhas enviadas.
 * Lança erro se a gravação remota falhar.
 */
export async function saveMetasRows(
  pipelineId: number,
  mes: string,
  rows: MetaVendedorEdit[],
): Promise<void> {
  const res = await fetch("/api/metas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pipeline_id: pipelineId, mes, rows }),
  });
  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignora corpo não-JSON */
    }
    throw new Error(msg);
  }
}
