import type { Etapa } from "./types";

/** Etapas de venda (não fazem parte da pré-venda) — excluídas ao agregar. */
const EXCLUI_VENDA = ["proposta", "negocia", "fechamento", "ganho", "perdid"];

function norm(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Ordem canônica do funil de pré-venda (independente da ordem de cada pipeline). */
function rank(n: string): number {
  if (n.includes("desqualific")) return 0;
  if (n === "entrada") return 1;
  if (n.includes("contato")) return 2;
  if (n.includes("reuni")) return 3;
  if (n.includes("no show") || n.includes("noshow")) return 4;
  return 5;
}

/**
 * Funil de pré-venda agregado: soma as etapas do pipeline SDR (todas) com as
 * etapas iniciais (pré-venda) do pipeline de vendas, casando por nome.
 */
export function mergeEtapasPreVenda(sdr: Etapa[], vendas: Etapa[]): Etapa[] {
  const map = new Map<string, Etapa>();

  const add = (arr: Etapa[], filtrarVenda: boolean) => {
    arr.forEach((e) => {
      const n = norm(e.stage_name);
      if (filtrarVenda && EXCLUI_VENDA.some((x) => n.includes(x))) return;
      const ex = map.get(n);
      if (ex) {
        ex.qtd += e.qtd;
        ex.valor += e.valor;
      } else {
        map.set(n, { ...e });
      }
    });
  };

  add(sdr, false); // pipeline SDR: todas as etapas
  add(vendas, true); // pipeline de vendas: só as etapas de pré-venda

  return [...map.values()]
    .map((e, i) => ({ ...e, stage_id: i, order: rank(norm(e.stage_name)) }))
    .sort((a, b) => a.order - b.order);
}
