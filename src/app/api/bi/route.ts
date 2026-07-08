import { NextResponse } from "next/server";
import { BI_ENDPOINT } from "@/lib/config";

/**
 * Proxy server-side para o endpoint do Apps Script.
 * Evita problemas de CORS no cliente e centraliza o tratamento de erro.
 *
 * Os dados só mudam 1x/dia (sync das 6h), então cacheamos na CDN do Vercel via
 * `s-maxage` + `stale-while-revalidate`: a CDN serve o resultado na hora e revalida
 * em segundo plano, então só a primeiríssima carga (cache frio) espera os ~15s.
 *  - `?nocache=1` ignora o cache (usado após salvar metas, para refletir na hora).
 *
 * O fetch ao Apps Script usa `no-store` (não o Data Cache do Next): o endpoint
 * responde via redirect 302→googleusercontent, e o Data Cache + redirect falha no
 * `next dev`. O cache que importa é o da CDN, controlado pelo header abaixo.
 *
 * Query params aceitos: from, to (YYYY-MM-DD), nocache.
 */
const REVALIDATE = 300; // 5 min

// O Apps Script do Google dá 404/5xx transitórios (cold start / instabilidade).
// Tentamos algumas vezes antes de mostrar erro ao usuário.
const ATTEMPTS = 3;
const RETRYABLE = new Set([404, 425, 429, 500, 502, 503, 504]);
const ATTEMPT_TIMEOUT_MS = 25_000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const nocache = searchParams.get("nocache") === "1";

  const url = new URL(BI_ENDPOINT);
  if (from) url.searchParams.set("from", from);
  if (to) url.searchParams.set("to", to);

  let lastError = "Falha ao consultar o endpoint";

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(url.toString(), {
          redirect: "follow",
          cache: "no-store",
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (res.ok) {
        // O Apps Script às vezes responde com content-type text/plain.
        const text = await res.text();
        const data = JSON.parse(text);

        // Não cacheia respostas de erro do próprio Apps Script (ok:false).
        const cacheHeader =
          nocache || !data?.ok
            ? "no-store"
            : `public, s-maxage=${REVALIDATE}, stale-while-revalidate=3600`;

        return NextResponse.json(data, {
          headers: { "Cache-Control": cacheHeader },
        });
      }

      lastError = `Endpoint respondeu ${res.status}`;
      if (!RETRYABLE.has(res.status)) break; // erro não-transitório: não insiste
    } catch (error) {
      // Timeout/abort ou corpo inválido (parcial no cold start): vale retry.
      lastError =
        error instanceof Error ? error.message : "Falha ao consultar o endpoint";
    }

    // Backoff progressivo antes da próxima tentativa (0,6s, 1,2s).
    if (attempt < ATTEMPTS) {
      await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }

  return NextResponse.json(
    { ok: false, error: lastError },
    { status: 502, headers: { "Cache-Control": "no-store" } },
  );
}
