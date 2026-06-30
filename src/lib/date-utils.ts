/**
 * Helpers para datas no formato YYYY-MM-DD (date sem timezone).
 * Evita o bug clássico em que `new Date("2026-06-17")` é interpretado como
 * UTC midnight e, em fusos negativos (Brasil = UTC-3), volta para o dia anterior.
 */

/** Parse 'YYYY-MM-DD' como meia-noite no fuso LOCAL. */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  // ISO completo já vem com timezone → confia no Date
  if (value.includes('T')) return new Date(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return new Date(value);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Formata 'YYYY-MM-DD' como dd/mm/yyyy no fuso local (sem deslocamento). */
export function formatLocalDate(value: string | null | undefined): string {
  const d = parseLocalDate(value);
  if (!d) return '';
  return d.toLocaleDateString('pt-BR');
}

/** Retorna true se a data (YYYY-MM-DD) está estritamente antes de hoje (local). */
export function isBeforeToday(value: string | null | undefined): boolean {
  const d = parseLocalDate(value);
  if (!d) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return d < today;
}

/** Retorna true se a data (YYYY-MM-DD) é hoje (local). */
export function isToday(value: string | null | undefined): boolean {
  const d = parseLocalDate(value);
  if (!d) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}
