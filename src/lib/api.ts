import type { BiResponse, MetaVendedorEdit, Usuario } from "./types";
import type { Range } from "./dates";

/** Busca os dados do BI via proxy interno (/api/bi). */
export async function fetchBi(range: Range): Promise<BiResponse> {
  const params = new URLSearchParams({ from: range.from, to: range.to });
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
