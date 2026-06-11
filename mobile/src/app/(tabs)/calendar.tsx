import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, EmptyState, FAB } from '@/components/ui';
import { MonthGrid } from '@/features/calendar/MonthGrid';
import { formatDateJa, todayISO } from '@/lib/utils';
import { useFamilyStore } from '@/store/useFamilyStore';
import { useTheme } from '@/theme/ThemeContext';

export default function CalendarScreen() {
  const router = useRouter();
  const { colors, radius } = useTheme();
  const events = useFamilyStore((s) => s.events);
  const members = useFamilyStore((s) => s.members);

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState(todayISO());

  const dayEvents = useMemo(
    () =>
      events
        .filter((e) => e.date === selected)
        .sort((a, b) => (a.start ?? '').localeCompare(b.start ?? '')),
    [events, selected],
  );

  const memberName = (id?: string) => members.find((m) => m.id === id)?.name;

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
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
        <Pressable onPress={() => shiftMonth(1)} hitSlop={12}>
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 12 }}>
        <MonthGrid
          year={cursor.year}
          month={cursor.month}
          selected={selected}
          events={events}
          onSelect={setSelected}
        />
      </View>

      <View style={[styles.daySheet, { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
        <View style={styles.daySheetHeader}>
          <AppText variant="headline">{formatDateJa(selected)}</AppText>
          <AppText variant="footnote" muted>
            {dayEvents.length}件の予定
          </AppText>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 120, gap: 10 }}>
          {dayEvents.length === 0 ? (
            <EmptyState icon="calendar-outline" message="この日の予定はまだありません" />
          ) : (
            dayEvents.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => router.push({ pathname: '/event-edit', params: { id: e.id } })}
                style={[styles.eventCard, { backgroundColor: colors.bgInset, borderRadius: radius.md }]}>
                <View style={[styles.eventBar, { backgroundColor: e.color ?? colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <AppText variant="body">{e.title}</AppText>
                  <AppText variant="footnote" muted>
                    {e.allDay ? '終日' : `${e.start ?? ''}${e.end ? ` - ${e.end}` : ''}`}
                    {memberName(e.memberId) ? ` ・ ${memberName(e.memberId)}` : ''}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>

      <FAB
        onPress={() => router.push({ pathname: '/event-edit', params: { date: selected } })}
      />
    </SafeAreaView>
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
  daySheet: { flex: 1, marginTop: 8, padding: 16, gap: 12 },
  daySheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  eventBar: { width: 4, alignSelf: 'stretch', borderRadius: 2, minHeight: 36 },
});
