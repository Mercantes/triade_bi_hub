import type { BiResponse } from "./types";
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
