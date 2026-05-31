import { format, formatDistanceToNow, isToday, isYesterday, isTomorrow, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';

export const DAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];
export const MONTHS_JA = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isToday(d)) return `今日 ${format(d, 'HH:mm')}`;
  if (isYesterday(d)) return `昨日 ${format(d, 'HH:mm')}`;
  if (d.getFullYear() === new Date().getFullYear()) {
    return format(d, 'M/d (E)', { locale: ja });
  }
  return format(d, 'yyyy/M/d', { locale: ja });
}

export function formatDateShort(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return '今日';
  if (isTomorrow(d)) return '明日';
  if (d.getFullYear() === new Date().getFullYear()) {
    return format(d, 'M/d(E)', { locale: ja });
  }
  return format(d, 'yyyy/M/d', { locale: ja });
}

export function formatMonthYear(date: Date): string {
  return format(date, 'yyyy年M月', { locale: ja });
}

export function getCalendarDays(month: Date): (Date | null)[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  const leadingNulls: null[] = Array(getDay(start)).fill(null);
  return [...leadingNulls, ...days];
}

export function getCalendarDaysForMonth(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading: null[] = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  return [...leading, ...days];
}

export function prevMonth(date: Date): Date {
  return subMonths(date, 1);
}

export function nextMonth(date: Date): Date {
  return addMonths(date, 1);
}

export function prevMonthYM(year: number, month: number): { year: number; month: number } {
  if (month === 0) return { year: year - 1, month: 11 };
  return { year, month: month - 1 };
}

export function nextMonthYM(year: number, month: number): { year: number; month: number } {
  if (month === 11) return { year: year + 1, month: 0 };
  return { year, month: month + 1 };
}

export function isSame(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function relativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { locale: ja, addSuffix: true });
  } catch {
    return '';
  }
}
