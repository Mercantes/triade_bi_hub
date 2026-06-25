import { NextResponse } from "next/server";
import { BI_ENDPOINT } from "@/lib/config";
import type { MetaVendedorEdit, Usuario } from "@/lib/types";

export const dynamic = "force-dynamic";

const META_FIELDS: (keyof MetaVendedorEdit)[] = [
  "meta_leads",
  "meta_reun_marcadas",
  "meta_reun_realizadas",
  "meta_vendas",
  "meta_ticket",
  "meta_faturamento",
  "meta_taxa_fechamento",
];

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * GET /api/metas → lista de usuários (para "adicionar vendedor" no modal).
 * Lê {exec}?action=usuarios. Degrada para [] se ainda não suportado.
 */
export async function GET() {
  try {
    const url = new URL(BI_ENDPOINT);
    url.searchParams.set("action", "usuarios");
    const res = await fetch(url.toString(), { cache: "no-store", redirect: "follow" });
    if (!res.ok) return NextResponse.json({ ok: true, usuarios: [] });
    const data = JSON.parse(await res.text());
    const usuarios: Usuario[] = Array.isArray(data?.usuarios)
      ? data.usuarios
          .map((u: { owner_id?: unknown; nome?: unknown }) => ({
            owner_id: Number(u.owner_id),
            nome: String(u.nome ?? ""),
          }))
          .filter((u: Usuario) => Number.isFinite(u.owner_id) && u.nome)
      : [];
    return NextResponse.json(
      { ok: true, usuarios },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: true, usuarios: [] });
  }
}

/**
 * POST /api/metas → grava as metas por vendedor na aba `metas`.
 * Body: { pipeline_id, mes: "YYYY-MM", rows: MetaVendedorEdit[] }.
 * Substitui todas as linhas daquele funil+mês pelas linhas enviadas
 * (CRUD por replace de escopo: criar = incluir, editar = alterar, excluir = omitir).
 */
export async function POST(request: Request) {
  let body: {
    pipeline_id?: unknown;
    mes?: unknown;
    rows?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const pipeline_id = Number(body.pipeline_id);
  const mes = String(body.mes ?? "");
  if (!Number.isFinite(pipeline_id) || !/^\d{4}-\d{2}$/.test(mes)) {
    return NextResponse.json(
      { ok: false, error: "pipeline_id ou mês inválido" },
      { status: 400 },
    );
  }

  const rows = (Array.isArray(body.rows) ? body.rows : []).map(
    (r: Record<string, unknown>) => {
      const out: Record<string, number> = { owner_id: Number(r.owner_id) };
      for (const f of META_FIELDS) out[f] = num(r[f]);
      return out;
    },
  );

  try {
    const res = await fetch(BI_ENDPOINT, {
      method: "POST",
      cache: "no-store",
      redirect: "follow",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_metas_rows", pipeline_id, mes, rows }),
    });
    let data: unknown = null;
    try {
      data = JSON.parse(await res.text());
    } catch {
      /* resposta não-JSON (provável: ação não suportada no Apps Script) */
    }
    if (!res.ok || (data as { ok?: boolean })?.ok !== true) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "O Apps Script não confirmou a gravação. Verifique se a ação save_metas_rows foi publicada (docs/integracao-metas-apps-script.md).",
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro ao gravar metas",
      },
      { status: 502 },
    );
  }
}
