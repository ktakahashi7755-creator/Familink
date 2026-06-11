import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { fromISODate, toISODate } from '@/lib/utils';
import type { FamilyEvent } from '@/types';
import { useTheme } from '@/theme/ThemeContext';
import { eventsOnDate } from './events';
import { isHoliday } from './holidays';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const LANES = 3; // max event lanes shown per day before "+N"
const LANE_H = 16;

interface Props {
  year: number;
  month: number; // 0-indexed
  selected: string;
  events: FamilyEvent[];
  onSelect: (iso: string) => void;
}

/** 6-week matrix (42 cells), Sunday-first. */
function buildWeeks(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const x = new Date(start);
      x.setDate(start.getDate() + w * 7 + d);
      row.push(x);
    }
    weeks.push(row);
  }
  return weeks;
}

export function MonthGrid({ year, month, selected, events, onSelect }: Props) {
  const { colors } = useTheme();
  const weeks = useMemo(() => buildWeeks(year, month), [year, month]);

  return (
    <View>
      <View style={styles.weekHeader}>
        {WEEKDAYS.map((w, i) => (
          <AppText
            key={w}
            variant="caption"
            style={styles.weekCell}
            color={i === 0 ? colors.red : i === 6 ? colors.primary : colors.textMuted}>
            {w}
          </AppText>
        ))}
      </View>
      {weeks.map((week, i) => (
        <WeekRow key={i} week={week} month={month} selected={selected} events={events} onSelect={onSelect} />
      ))}
    </View>
  );
}

interface Segment {
  event: FamilyEvent;
  startCol: number;
  endCol: number;
  lane: number;
}

function WeekRow({
  week,
  month,
  selected,
  events,
  onSelect,
}: {
  week: Date[];
  month: number;
  selected: string;
  events: FamilyEvent[];
  onSelect: (iso: string) => void;
}) {
  const { colors } = useTheme();
  const todayIso = toISODate(new Date());
  const isos = useMemo(() => week.map(toISODate), [week]);

  // Build event segments for the week with greedy lane packing.
  const { segments, overflow } = useMemo(() => buildSegments(week, isos, events), [week, isos, events]);

  return (
    <View style={styles.week}>
      {/* date row — full-height tap targets, number at top */}
      <View style={styles.dayRow}>
        {week.map((d, col) => {
          const iso = isos[col];
          const inMonth = d.getMonth() === month;
          const isToday = iso === todayIso;
          const isSelected = iso === selected;
          const holiday = isHoliday(iso);
          const weekend = d.getDay() === 0 || d.getDay() === 6;
          const dayColor = isSelected
            ? '#fff'
            : !inMonth
              ? colors.textMuted
              : holiday || d.getDay() === 0
                ? colors.red
                : d.getDay() === 6
                  ? colors.primary
                  : colors.text;
          return (
            <Pressable
              key={iso}
              style={styles.dayCol}
              onPress={() => {
                haptic.selection();
                onSelect(iso);
              }}>
              <View
                style={[
                  styles.dayCircle,
                  isSelected && { backgroundColor: colors.primary },
                  isToday && !isSelected && { backgroundColor: colors.primaryLight },
                ]}>
                <AppText
                  variant="footnote"
                  color={dayColor}
                  style={{ opacity: inMonth ? 1 : 0.45, fontWeight: weekend || holiday ? '600' : '400' }}>
                  {d.getDate()}
                </AppText>
              </View>
              {overflow[col] > 0 && (
                <AppText variant="caption" muted style={styles.overflow}>
                  +{overflow[col]}
                </AppText>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* lane overlay — bars span across columns, below the date number */}
      <View pointerEvents="none" style={styles.laneBand}>
        {segments.map((s, idx) => {
          const spanCols = s.endCol - s.startCol + 1;
          const multi = !!s.event.endDate && (!s.event.repeat || s.event.repeat === 'none');
          return (
            <View
              key={s.event.id + idx}
              style={{
                position: 'absolute',
                top: s.lane * LANE_H,
                left: `${(s.startCol / 7) * 100}%`,
                width: `${(spanCols / 7) * 100}%`,
                height: LANE_H - 3,
                paddingHorizontal: 2,
              }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: (s.event.color ?? colors.primary) + (multi ? '' : '26'),
                  borderRadius: 4,
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}>
                <AppText
                  variant="caption"
                  numberOfLines={1}
                  color={multi ? '#fff' : s.event.color ?? colors.primary}
                  style={styles.barLabel}>
                  {s.event.title}
                </AppText>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Greedy lane assignment producing spanning + single-day segments. */
function buildSegments(week: Date[], isos: string[], events: FamilyEvent[]): { segments: Segment[]; overflow: number[] } {
  const weekStart = isos[0];
  const weekEnd = isos[6];
  const colOf = (iso: string) => Math.round((fromISODate(iso).getTime() - fromISODate(weekStart).getTime()) / 86_400_000);

  // 1) multi-day spanning events intersecting this week.
  const spanning = events.filter(
    (e) => e.endDate && (!e.repeat || e.repeat === 'none') && e.date <= weekEnd && e.endDate >= weekStart,
  );
  const spanIds = new Set(spanning.map((e) => e.id));

  const raw: { event: FamilyEvent; startCol: number; endCol: number }[] = spanning.map((e) => ({
    event: e,
    startCol: Math.max(0, colOf(e.date)),
    endCol: Math.min(6, colOf(e.endDate as string)),
  }));

  // 2) single-day occurrences (incl. recurring matches), excluding spanning ones.
  isos.forEach((iso, col) => {
    for (const e of eventsOnDate(events, iso)) {
      if (spanIds.has(e.id)) continue;
      raw.push({ event: e, startCol: col, endCol: col });
    }
  });

  // Sort: spanning/earlier first, longer first — stable lanes.
  raw.sort((a, b) => a.startCol - b.startCol || b.endCol - b.startCol - (a.endCol - a.startCol));

  const laneEnds: number[] = []; // lane -> last occupied col
  const segments: Segment[] = [];
  const overflow = [0, 0, 0, 0, 0, 0, 0];

  for (const r of raw) {
    let lane = laneEnds.findIndex((end) => end < r.startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(r.endCol);
    } else {
      laneEnds[lane] = r.endCol;
    }
    if (lane >= LANES) {
      for (let c = r.startCol; c <= r.endCol; c++) overflow[c]++;
      continue;
    }
    segments.push({ ...r, lane });
  }

  return { segments, overflow };
}

const WEEK_H = 32 + LANES * LANE_H;

const styles = StyleSheet.create({
  weekHeader: { flexDirection: 'row' },
  weekCell: { flex: 1, textAlign: 'center', paddingVertical: 6 },
  week: { position: 'relative', height: WEEK_H },
  dayRow: { flexDirection: 'row', height: WEEK_H },
  dayCol: { flex: 1, alignItems: 'center', paddingTop: 3 },
  dayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  overflow: { fontSize: 9, position: 'absolute', bottom: 2 },
  laneBand: { position: 'absolute', top: 33, left: 0, right: 0, height: LANES * LANE_H },
  barLabel: { fontSize: 10, lineHeight: 13 },
});
