import { NextResponse } from "next/server";
import { BI_ENDPOINT } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Proxy server-side para o endpoint do Apps Script.
 * Evita problemas de CORS no cliente e centraliza o tratamento de erro.
 *
 * Query params aceitos: from, to (YYYY-MM-DD).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const url = new URL(BI_ENDPOINT);
  if (from) url.searchParams.set("from", from);
  if (to) url.searchParams.set("to", to);

  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      redirect: "follow",
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Endpoint respondeu ${res.status}` },
        { status: 502 },
      );
    }

    // O Apps Script às vezes responde com content-type text/plain.
    const text = await res.text();
    const data = JSON.parse(text);

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Falha ao consultar o endpoint",
      },
      { status: 502 },
    );
  }
}
