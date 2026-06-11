import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { runOnJS } from 'react-native-reanimated';

import { Segmented } from '@/components/Segmented';
import { AppText, EmptyState, FAB } from '@/components/ui';
import { MonthGrid } from '@/features/calendar/MonthGrid';
import { eventsOnDate, upcomingOccurrences } from '@/features/calendar/events';
import { holidayName } from '@/features/calendar/holidays';
import { haptic } from '@/lib/haptics';
import { formatDateJa, fromISODate, toISODate, todayISO, weekdayJa } from '@/lib/utils';
import { useFamilyStore } from '@/store/useFamilyStore';
import { useTheme } from '@/theme/ThemeContext';
import type { FamilyEvent } from '@/types';

type CalView = 'month' | 'week' | 'list';

export default function CalendarScreen() {
  const { colors, radius } = useTheme();
  const events = useFamilyStore((s) => s.events);
  const members = useFamilyStore((s) => s.members);

  const [view, setView] = useState<CalView>('month');
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState(todayISO());
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  // Member visibility filter (events with no member always show).
  const visibleEvents = useMemo(
    () => events.filter((e) => !e.memberId || !hidden.has(e.memberId)),
    [events, hidden],
  );

  function toggleMember(id: string) {
    haptic.selection();
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function shiftMonth(delta: number) {
    haptic.light();
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function goToday() {
    haptic.light();
    const d = new Date();
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(todayISO());
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <AppText variant="title2">
          {cursor.year}年{cursor.month + 1}月
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={goToday} hitSlop={8}>
            <AppText variant="footnote" color={colors.primary}>
              今日
            </AppText>
          </Pressable>
          <Pressable onPress={() => shiftMonth(1)} hitSlop={12}>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <Segmented<CalView>
          options={[
            { key: 'month', label: '月' },
            { key: 'week', label: '週' },
            { key: 'list', label: 'リスト' },
          ]}
          value={view}
          onChange={(v) => {
            haptic.selection();
            setView(v);
          }}
        />
      </View>

      {/* Member filter */}
      {members.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.memberRow}>
          {members.map((m) => {
            const off = hidden.has(m.id);
            return (
              <Pressable
                key={m.id}
                onPress={() => toggleMember(m.id)}
                style={[
                  styles.memberChip,
                  { borderColor: m.color, backgroundColor: off ? 'transparent' : m.color, borderRadius: radius.full },
                ]}>
                <AppText variant="caption" color={off ? colors.textMuted : '#fff'}>
                  {m.name}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {view === 'month' && (
        <MonthView
          cursor={cursor}
          selected={selected}
          events={visibleEvents}
          onSelect={setSelected}
          onShiftMonth={shiftMonth}
        />
      )}
      {view === 'week' && <WeekView selected={selected} events={visibleEvents} onSelect={setSelected} members={members} />}
      {view === 'list' && <ListView events={visibleEvents} members={members} />}

      <FAB onPress={() => router.push({ pathname: '/event-edit', params: { date: selected } })} />
    </SafeAreaView>
  );
}

/* ---------- Month ---------- */
function MonthView({
  cursor,
  selected,
  events,
  onSelect,
  onShiftMonth,
}: {
  cursor: { year: number; month: number };
  selected: string;
  events: FamilyEvent[];
  onSelect: (iso: string) => void;
  onShiftMonth: (delta: number) => void;
}) {
  const { colors, radius } = useTheme();
  const dayEvents = useMemo(() => eventsOnDate(events, selected), [events, selected]);
  const holiday = holidayName(selected);

  const flingPrev = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => runOnJS(onShiftMonth)(-1));
  const flingNext = Gesture.Fling()
    .direction(Directions.LEFT)
    .onEnd(() => runOnJS(onShiftMonth)(1));
  const swipe = Gesture.Exclusive(flingPrev, flingNext);

  return (
    <>
      <GestureDetector gesture={swipe}>
        <View style={{ paddingHorizontal: 12, marginTop: 8 }}>
          <MonthGrid year={cursor.year} month={cursor.month} selected={selected} events={events} onSelect={onSelect} />
        </View>
      </GestureDetector>
      <View style={[styles.daySheet, { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppText variant="headline">{formatDateJa(selected)}</AppText>
          {holiday && (
            <View style={[styles.holidayPill, { backgroundColor: colors.redLight }]}>
              <AppText variant="caption" color={colors.red}>
                {holiday}
              </AppText>
            </View>
          )}
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 120, gap: 10, paddingTop: 8 }}>
          {dayEvents.length === 0 ? (
            <EmptyState icon="calendar-outline" message="この日の予定はまだありません" />
          ) : (
            dayEvents.map((e) => <EventCard key={e.id} event={e} />)
          )}
        </ScrollView>
      </View>
    </>
  );
}

/* ---------- Week ---------- */
function WeekView({
  selected,
  events,
  onSelect,
  members,
}: {
  selected: string;
  events: FamilyEvent[];
  onSelect: (iso: string) => void;
  members: { id: string; name: string; color: string }[];
}) {
  const { colors, radius } = useTheme();
  const weekDays = useMemo(() => {
    const d = fromISODate(selected);
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(start);
      x.setDate(start.getDate() + i);
      return toISODate(x);
    });
  }, [selected]);

  const dayEvents = useMemo(() => eventsOnDate(events, selected), [events, selected]);
  const todayIso = todayISO();

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.weekStrip}>
        {weekDays.map((iso) => {
          const d = fromISODate(iso);
          const isSel = iso === selected;
          const isToday = iso === todayIso;
          const count = eventsOnDate(events, iso).length;
          return (
            <Pressable
              key={iso}
              onPress={() => {
                haptic.selection();
                onSelect(iso);
              }}
              style={[styles.weekDay, isSel && { backgroundColor: colors.primary, borderRadius: radius.md }]}>
              <AppText variant="caption" color={isSel ? 'rgba(255,255,255,0.8)' : colors.textMuted}>
                {weekdayJa(d)}
              </AppText>
              <AppText variant="headline" color={isSel ? '#fff' : isToday ? colors.primary : colors.text}>
                {d.getDate()}
              </AppText>
              <View style={[styles.weekDot, { backgroundColor: count ? (isSel ? '#fff' : colors.primary) : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }}>
        <AppText variant="headline">{formatDateJa(selected)}</AppText>
        {dayEvents.length === 0 ? (
          <EmptyState icon="calendar-outline" message="この日の予定はまだありません" />
        ) : (
          dayEvents.map((e) => <EventCard key={e.id} event={e} memberName={members.find((m) => m.id === e.memberId)?.name} />)
        )}
      </ScrollView>
    </View>
  );
}

/* ---------- List (Agenda) ---------- */
function ListView({ events, members }: { events: FamilyEvent[]; members: { id: string; name: string; color: string }[] }) {
  const groups = useMemo(() => upcomingOccurrences(events, todayISO(), 60), [events]);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
      {groups.length === 0 ? (
        <EmptyState icon="calendar-outline" message="今後60日間の予定はありません" />
      ) : (
        groups.map((g) => (
          <View key={g.iso} style={{ gap: 8 }}>
            <AppText variant="footnote" muted>
              {formatDateJa(g.iso)}
            </AppText>
            {g.events.map((e) => (
              <EventCard key={e.id + g.iso} event={e} memberName={members.find((m) => m.id === e.memberId)?.name} />
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

/* ---------- Shared event card ---------- */
function EventCard({ event, memberName }: { event: FamilyEvent; memberName?: string }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/event-edit', params: { id: event.id } })}
      style={[styles.eventCard, { backgroundColor: colors.bgInset, borderRadius: radius.md }]}>
      <View style={[styles.eventBar, { backgroundColor: event.color ?? colors.primary }]} />
      <View style={{ flex: 1 }}>
        <AppText variant="body">{event.title}</AppText>
        <AppText variant="footnote" muted>
          {event.allDay ? '終日' : `${event.start ?? ''}${event.end ? ` - ${event.end}` : ''}`}
          {event.repeat && event.repeat !== 'none' ? ' ・繰り返し' : ''}
          {memberName ? ` ・ ${memberName}` : ''}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  memberRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  memberChip: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5 },
  daySheet: { flex: 1, marginTop: 8, padding: 16, gap: 4 },
  holidayPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  weekDay: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2 },
  weekDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  eventBar: { width: 4, alignSelf: 'stretch', borderRadius: 2, minHeight: 36 },
});
