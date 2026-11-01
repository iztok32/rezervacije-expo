// Datumi iz API-ja so 'Y-m-d' brez časovnega pasu — razčlenimo jih kot lokalni datum,
// sicer bi new Date('2026-02-04') v pasovih zahodno od UTC pokazal prejšnji dan.
export function parseDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDateString(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions): string {
  return parseDate(value).toLocaleDateString('sl-SI', options);
}

export function formatTimeRange(start: string | null, end: string | null): string {
  if (!start) return '';
  return end ? `${start}–${end}` : start;
}
