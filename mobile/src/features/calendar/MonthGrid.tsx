import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { toISODate } from '@/lib/utils';
import type { FamilyEvent } from '@/types';
import { useTheme } from '@/theme/ThemeContext';
import { eventsByDate } from './events';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

interface Props {
  year: number;
  month: number; // 0-indexed
  selected: string;
  events: FamilyEvent[];
  onSelect: (iso: string) => void;
}

/** Builds a 6-row month matrix (always 42 cells for stable layout). */
function buildMatrix(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay()); // back to Sunday
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function MonthGrid({ year, month, selected, events, onSelect }: Props) {
  const { colors } = useTheme();
  const cells = buildMatrix(year, month);
  const todayIso = toISODate(new Date());

  // event occurrences per visible date (expands recurring + multi-day)
  const isoList = cells.map(toISODate);
  const byDate = eventsByDate(events, isoList);

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
      <View style={styles.grid}>
        {cells.map((d) => {
          const iso = toISODate(d);
          const inMonth = d.getMonth() === month;
          const isToday = iso === todayIso;
          const isSelected = iso === selected;
          const dayEvents = byDate.get(iso) ?? [];
          return (
            <Pressable
              key={iso}
              style={styles.cell}
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
                  color={
                    isSelected
                      ? '#fff'
                      : !inMonth
                        ? colors.textMuted
                        : d.getDay() === 0
                          ? colors.red
                          : d.getDay() === 6
                            ? colors.primary
                            : colors.text
                  }
                  style={{ opacity: inMonth ? 1 : 0.4 }}>
                  {d.getDate()}
                </AppText>
              </View>
              <View style={styles.dotRow}>
                {dayEvents.slice(0, 3).map((e, i) => (
                  <View
                    key={e.id + i}
                    style={[styles.dot, { backgroundColor: e.color ?? colors.primary }]}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekHeader: { flexDirection: 'row' },
  weekCell: { flex: 1, textAlign: 'center', paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4, minHeight: 48 },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dotRow: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});
