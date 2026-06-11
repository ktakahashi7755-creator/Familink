/** Small shared helpers. */

/** Stable-ish unique id (no native crypto dependency required). */
export function uid(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Format a Date to 'YYYY-MM-DD' in local time. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Parse 'YYYY-MM-DD' as a local Date. */
export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Yen formatter. */
export function formatYen(n: number): string {
  return `¥${Math.round(n).toLocaleString('ja-JP')}`;
}

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];
export function weekdayJa(d: Date): string {
  return WEEKDAYS_JA[d.getDay()];
}

/** 'M月D日(曜)' display. */
export function formatDateJa(s: string): string {
  const d = fromISODate(s);
  return `${d.getMonth() + 1}月${d.getDate()}日(${weekdayJa(d)})`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
