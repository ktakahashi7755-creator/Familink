/**
 * Event occurrence engine.
 * ------------------------------------------------------------------
 * Resolves which events "occur" on a given calendar day, expanding both
 * multi-day (date..endDate) spans and recurrence rules
 * (daily/weekly/monthly/yearly). This is what lets the calendar feel
 * richer than a flat list — recurring lessons, multi-day trips, etc.
 */
import { fromISODate, toISODate } from '@/lib/utils';
import type { FamilyEvent } from '@/types';

const DAY_MS = 86_400_000;

function daysBetween(aIso: string, bIso: string): number {
  return Math.round((fromISODate(bIso).getTime() - fromISODate(aIso).getTime()) / DAY_MS);
}

/** True if `event` occurs on the given ISO date. */
export function occursOn(event: FamilyEvent, iso: string): boolean {
  const base = event.date;
  if (iso < base) return false;

  // Multi-day span (non-recurring): date..endDate inclusive.
  if (event.endDate && (!event.repeat || event.repeat === 'none')) {
    return iso >= base && iso <= event.endDate;
  }

  if (!event.repeat || event.repeat === 'none') {
    return iso === base;
  }

  const b = fromISODate(base);
  const t = fromISODate(iso);
  switch (event.repeat) {
    case 'daily':
      return true;
    case 'weekly':
      return daysBetween(base, iso) % 7 === 0;
    case 'monthly':
      return b.getDate() === t.getDate();
    case 'yearly':
      return b.getDate() === t.getDate() && b.getMonth() === t.getMonth();
    default:
      return iso === base;
  }
}

/** Sorted events occurring on the given date. */
export function eventsOnDate(events: FamilyEvent[], iso: string): FamilyEvent[] {
  return events
    .filter((e) => occursOn(e, iso))
    .sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return (a.start ?? '').localeCompare(b.start ?? '');
    });
}

/** Map of iso -> events, for a list of dates (used by the month grid). */
export function eventsByDate(events: FamilyEvent[], isoDates: string[]): Map<string, FamilyEvent[]> {
  const map = new Map<string, FamilyEvent[]>();
  for (const iso of isoDates) {
    map.set(iso, eventsOnDate(events, iso));
  }
  return map;
}

/** Upcoming occurrences from `fromIso` forward, flattened across `days` days. */
export function upcomingOccurrences(
  events: FamilyEvent[],
  fromIso: string,
  days: number,
): { iso: string; events: FamilyEvent[] }[] {
  const start = fromISODate(fromIso);
  const out: { iso: string; events: FamilyEvent[] }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const iso = toISODate(d);
    const evs = eventsOnDate(events, iso);
    if (evs.length) out.push({ iso, events: evs });
  }
  return out;
}
