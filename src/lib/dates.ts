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

// ── Vnos v obrazcih ─────────────────────────────────────────────────────────
// Na telefonu se datum vtipka; sprejmemo slovensko obliko (15.11.2026) in ISO (2026-11-15).

/** 'Y-m-d' → '15. 11. 2026' za prikaz v polju. */
export function toUserDate(value: string | null): string {
  if (!value) return '';
  const [y, m, d] = value.split('-');
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

/** Vnos uporabnika → 'Y-m-d'; '' → null; neveljaven vnos → undefined. */
export function parseUserDate(input: string): string | null | undefined {
  const text = input.trim();
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const si = text.match(/^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})$/);
  const [y, m, d] = iso ? [iso[1], iso[2], iso[3]] : si ? [si[3], si[2], si[1]] : [];
  if (!y) return undefined;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) {
    return undefined;
  }
  return toDateString(date);
}

/** Vnos ure (17:00, 17.00, 1700, 9) → 'HH:MM'; neveljaven vnos → undefined. */
export function parseUserTime(input: string): string | undefined {
  const text = input.trim();
  const match = text.match(/^(\d{1,2})(?:[:.]?(\d{2}))?$/);
  if (!match) return undefined;
  const h = Number(match[1]);
  const min = Number(match[2] ?? 0);
  if (h > 23 || min > 59) return undefined;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
