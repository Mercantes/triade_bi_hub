import type { MetasEdit } from "./types";

/**
 * Metas editadas pelo usuário, persistidas no navegador.
 *
 * O endpoint do Apps Script é somente leitura — não há gravação de metas de
 * volta. Por isso as metas editadas em "Editar metas" ficam salvas localmente
 * (localStorage) e são aplicadas sobre as metas vindas da API.
 */

const KEY = "bi-triade:metas-edit";

export function loadMetasEdit(): MetasEdit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MetasEdit) : null;
  } catch {
    return null;
  }
}

export function saveMetasEdit(metas: MetasEdit | null): void {
  if (typeof window === "undefined") return;
  try {
    if (metas) window.localStorage.setItem(KEY, JSON.stringify(metas));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* ignora cota/erros de storage */
  }
}
