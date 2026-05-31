import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useEvents, useMembers } from '../../src/store';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../src/constants/theme';
import { Avatar } from '../../src/components/ui/Avatar';
import { getCalendarDaysForMonth, prevMonthYM, nextMonthYM, todayStr } from '../../src/utils/date';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const events = useEvents();
  const members = useMembers();

  const today = todayStr();
  const [current, setCurrent] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);

  const days = useMemo(() => getCalendarDaysForMonth(current.year, current.month), [current]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, typeof events> = {};
    for (const e of events) {
      const key = e.date ?? e.startDate ?? '';
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [events]);

  const selectedEvents = useMemo(
    () => (eventsByDate[selected] ?? []).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
    [eventsByDate, selected],
  );

  const monthLabel = `${current.year}年${current.month + 1}月`;
  // month is 0-indexed internally

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>カレンダー</Text>
        <TouchableOpacity onPress={() => router.push('/modals/event-edit')}>
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setCurrent(prevMonthYM(current.year, current.month))} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity onPress={() => setCurrent(nextMonthYM(current.year, current.month))} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarWrap}>
          {/* Weekday headers */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <Text
                key={d}
                style={[
                  styles.weekday,
                  i === 0 && styles.sunday,
                  i === 6 && styles.saturday,
                ]}
              >
                {d}
              </Text>
            ))}
          </View>
          {/* Day cells */}
          {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIdx) => (
            <View key={weekIdx} style={styles.weekRow}>
              {days.slice(weekIdx * 7, weekIdx * 7 + 7).map((d, dayIdx) => {
                const dateStr = d ? `${current.year}-${String(current.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
                const isToday = dateStr === today;
                const isSelected = dateStr === selected;
                const dotCount = d ? (eventsByDate[dateStr]?.length ?? 0) : 0;
                const isSun = dayIdx === 0;
                const isSat = dayIdx === 6;

                return (
                  <TouchableOpacity
                    key={dayIdx}
                    style={styles.dayCell}
                    onPress={() => d && setSelected(dateStr)}
                    disabled={!d}
                  >
                    <View style={[
                      styles.dayNum,
                      isToday && styles.dayNumToday,
                      isSelected && !isToday && styles.dayNumSelected,
                    ]}>
                      <Text style={[
                        styles.dayText,
                        isSun && styles.sundayText,
                        isSat && styles.saturdayText,
                        isToday && styles.dayTextToday,
                        isSelected && !isToday && styles.dayTextSelected,
                        !d && styles.dayTextEmpty,
                      ]}>
                        {d ?? ''}
                      </Text>
                    </View>
                    {dotCount > 0 && (
                      <View style={styles.dotsRow}>
                        {Array.from({ length: Math.min(dotCount, 3) }).map((_, di) => (
                          <View
                            key={di}
                            style={[
                              styles.dot,
                              { backgroundColor: eventsByDate[dateStr]?.[di]?.color ?? Colors.primary },
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Selected day events */}
        <View style={styles.eventsSection}>
          <Text style={styles.selectedDateLabel}>
            {selected === today ? '今日' : selected.replace(/-/g, '/')}
          </Text>
          {selectedEvents.length === 0 ? (
            <View style={styles.noEventsCard}>
              <Text style={styles.noEventsText}>予定はありません</Text>
              <TouchableOpacity onPress={() => router.push('/modals/event-edit')}>
                <Text style={styles.addEventLink}>予定を追加する</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.eventList}>
              {selectedEvents.map((e, i) => (
                <Animated.View key={e.id} entering={FadeInDown.delay(i * 40).springify().damping(18)}>
                  <TouchableOpacity style={styles.eventCard}>
                    <View style={[styles.eventColorBar, { backgroundColor: e.color ?? Colors.primary }]} />
                    <View style={styles.eventContent}>
                      <Text style={styles.eventTitle}>{e.title}</Text>
                      {e.time && <Text style={styles.eventTime}>{e.time}</Text>}
                      {e.place && (
                        <View style={styles.eventMeta}>
                          <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                          <Text style={styles.eventMetaText}>{e.place}</Text>
                        </View>
                      )}
                    </View>
                    {e.memberIds && e.memberIds.length > 0 && (
                      <View style={styles.avatarStack}>
                        {e.memberIds.slice(0, 3).map(mid => {
                          const m = members.find(mm => mm.id === mid);
                          return m ? <Avatar key={mid} name={m.name} color={m.color} size={24} /> : null;
                        })}
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.base,
    backgroundColor: Colors.background,
  },
  headerTitle: { fontSize: Typography.xl, fontWeight: '700', color: Colors.text },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text },
  calendarWrap: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.base,
    borderRadius: Radius.xl,
    padding: Spacing.sm,
    ...Shadows.sm,
    marginBottom: Spacing.base,
  },
  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1, textAlign: 'center',
    fontSize: Typography.xs, fontWeight: '600',
    color: Colors.textMuted, paddingVertical: 6,
  },
  sunday: { color: Colors.error },
  saturday: { color: Colors.primary },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  dayNum: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayNumToday: { backgroundColor: Colors.primary },
  dayNumSelected: { backgroundColor: Colors.primaryLight },
  dayText: { fontSize: Typography.sm, color: Colors.text },
  sundayText: { color: Colors.error },
  saturdayText: { color: Colors.primary },
  dayTextToday: { color: '#fff', fontWeight: '700' },
  dayTextSelected: { color: Colors.primary, fontWeight: '700' },
  dayTextEmpty: { color: 'transparent' },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2, height: 5 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  eventsSection: { paddingHorizontal: Spacing.base, paddingBottom: 100 },
  selectedDateLabel: { fontSize: Typography.base, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  noEventsCard: {
    backgroundColor: Colors.card, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, ...Shadows.sm,
  },
  noEventsText: { fontSize: Typography.sm, color: Colors.textMuted },
  addEventLink: { fontSize: Typography.sm, color: Colors.primary, fontWeight: '600' },
  eventList: { gap: Spacing.sm },
  eventCard: {
    backgroundColor: Colors.card, borderRadius: Radius.xl,
    flexDirection: 'row', alignItems: 'center',
    overflow: 'hidden', ...Shadows.sm,
  },
  eventColorBar: { width: 4, height: '100%', minHeight: 60 },
  eventContent: { flex: 1, padding: Spacing.base },
  eventTitle: { fontSize: Typography.base, fontWeight: '600', color: Colors.text },
  eventTime: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  eventMetaText: { fontSize: Typography.xs, color: Colors.textMuted },
  avatarStack: { flexDirection: 'row', paddingRight: Spacing.base, gap: -6 },
});
