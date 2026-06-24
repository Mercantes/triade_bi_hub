/**
 * URL do App da Web (Apps Script) que serve os dados do BI.
 * Pode ser sobrescrita via variável de ambiente BI_ENDPOINT.
 */
export const BI_ENDPOINT =
  process.env.BI_ENDPOINT ??
  "https://script.google.com/macros/s/AKfycbwWlE3Z-EozcOdX7cjT9q3nwrGdMZgKC6KEieQnq7SWlK0vNlUkh6iL_ZdcLGNbTbRY/exec";
