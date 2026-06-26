import { NextResponse } from "next/server";
import { BI_ENDPOINT } from "@/lib/config";

/**
 * Proxy server-side para o endpoint do Apps Script.
 * Evita problemas de CORS no cliente e centraliza o tratamento de erro.
 *
 * Os dados só mudam 1x/dia (sync das 6h), então cacheamos o resultado para
 * não recomputar o Apps Script (~15s) a cada visita:
 *  - Data Cache do Vercel (fetch `revalidate`) reaproveita a resposta entre invocações.
 *  - `stale-while-revalidate` na CDN serve o cache na hora e revalida em segundo plano,
 *    então só a primeiríssima carga (cache frio) espera.
 *  - `?nocache=1` ignora o cache (usado após salvar metas, para refletir na hora).
 *
 * Query params aceitos: from, to (YYYY-MM-DD), nocache.
 */
const REVALIDATE = 300; // 5 min

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const nocache = searchParams.get("nocache") === "1";

  const url = new URL(BI_ENDPOINT);
  if (from) url.searchParams.set("from", from);
  if (to) url.searchParams.set("to", to);

  try {
    const res = await fetch(url.toString(), {
      redirect: "follow",
      ...(nocache
        ? { cache: "no-store" as const }
        : { next: { revalidate: REVALIDATE } }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Endpoint respondeu ${res.status}` },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    // O Apps Script às vezes responde com content-type text/plain.
    const text = await res.text();
    const data = JSON.parse(text);

    // Não cacheia respostas de erro do próprio Apps Script (ok:false).
    const cacheHeader =
      nocache || !data?.ok
        ? "no-store"
        : `public, s-maxage=${REVALIDATE}, stale-while-revalidate=3600`;

    return NextResponse.json(data, { headers: { "Cache-Control": cacheHeader } });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Falha ao consultar o endpoint",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
