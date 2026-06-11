import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Card } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { formatDateJa, todayISO } from '@/lib/utils';
import { useFamilyStore } from '@/store/useFamilyStore';
import { useTheme } from '@/theme/ThemeContext';

interface QuickLink {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  tint: 'primary' | 'secondary' | 'accent' | 'purple' | 'pink' | 'indigo';
}

const QUICK_LINKS: QuickLink[] = [
  { label: '買い物', icon: 'cart', href: '/shopping', tint: 'secondary' },
  { label: '家計', icon: 'wallet', href: '/budget', tint: 'accent' },
  { label: 'アルバム', icon: 'images', href: '/album', tint: 'purple' },
  { label: '体調', icon: 'thermometer', href: '/health', tint: 'pink' },
  { label: '持ち物', icon: 'bag-handle', href: '/prep', tint: 'indigo' },
  { label: 'メモ', icon: 'document-text', href: '/memo', tint: 'primary' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const profile = useFamilyStore((s) => s.profile);
  const events = useFamilyStore((s) => s.events);
  const tasks = useFamilyStore((s) => s.tasks);
  const shoppingItems = useFamilyStore((s) => s.shoppingItems);

  const today = todayISO();
  const todaysEvents = useMemo(
    () => events.filter((e) => e.date === today).sort((a, b) => (a.start ?? '').localeCompare(b.start ?? '')),
    [events, today],
  );
  const openTasks = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const shoppingLeft = shoppingItems.filter((i) => !i.done).length;

  const greeting = getGreeting();

  const tintMap = {
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    purple: colors.purple,
    pink: colors.pink,
    indigo: colors.indigo,
  } as const;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        {/* Greeting + Hoku */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="footnote" muted>
              {formatDateJa(today)}
            </AppText>
            <AppText variant="largeTitle">
              {greeting}
              {profile.name ? `、${profile.name}さん` : ''}
            </AppText>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/hoku')}
            style={[styles.hokuBadge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="sparkles" size={26} color={colors.primary} />
          </Pressable>
        </View>

        {/* Today's schedule */}
        <Card>
          <View style={styles.cardHeader}>
            <AppText variant="headline">今日の予定</AppText>
            <Pressable onPress={() => router.push('/(tabs)/calendar')}>
              <AppText variant="footnote" color={colors.primary}>
                すべて見る
              </AppText>
            </Pressable>
          </View>
          {todaysEvents.length === 0 ? (
            <AppText variant="callout" muted style={{ paddingVertical: 8 }}>
              今日の予定はありません。ゆっくり過ごせますね。
            </AppText>
          ) : (
            <View style={{ gap: 10, marginTop: 8 }}>
              {todaysEvents.slice(0, 4).map((e) => (
                <View key={e.id} style={styles.eventRow}>
                  <View
                    style={{
                      width: 4,
                      alignSelf: 'stretch',
                      borderRadius: 2,
                      backgroundColor: e.color ?? colors.primary,
                    }}
                  />
                  <AppText variant="footnote" muted style={{ width: 52 }}>
                    {e.allDay ? '終日' : (e.start ?? '')}
                  </AppText>
                  <AppText variant="body" style={{ flex: 1 }} numberOfLines={1}>
                    {e.title}
                  </AppText>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Tasks summary */}
        <Pressable onPress={() => router.push('/(tabs)/board')}>
          <Card>
            <View style={styles.cardHeader}>
              <AppText variant="headline">やること</AppText>
              <View style={[styles.countPill, { backgroundColor: colors.bgMuted }]}>
                <AppText variant="footnote">{openTasks.length}</AppText>
              </View>
            </View>
            {openTasks.length === 0 ? (
              <AppText variant="callout" muted style={{ paddingVertical: 8 }}>
                未完了のタスクはありません 🎉
              </AppText>
            ) : (
              <View style={{ gap: 8, marginTop: 8 }}>
                {openTasks.slice(0, 3).map((t) => (
                  <View key={t.id} style={styles.taskRow}>
                    <Ionicons name="ellipse-outline" size={18} color={colors.textMuted} />
                    <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>
                      {t.title}
                    </AppText>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </Pressable>

        {/* Quick links grid */}
        <View style={[styles.grid, { gap: spacing.md }]}>
          {QUICK_LINKS.map((q) => (
            <Pressable
              key={q.href}
              accessibilityRole="button"
              accessibilityLabel={q.label}
              onPress={() => {
                haptic.light();
                router.push(q.href as never);
              }}
              style={({ pressed }) => [
                styles.quickCell,
                { backgroundColor: colors.bgCard, borderRadius: radius.md, opacity: pressed ? 0.7 : 1 },
              ]}>
              <View style={[styles.quickIcon, { backgroundColor: tintMap[q.tint] + '22' }]}>
                <Ionicons name={q.icon} size={24} color={tintMap[q.tint]} />
              </View>
              <AppText variant="subhead">{q.label}</AppText>
              {q.href === '/shopping' && shoppingLeft > 0 && (
                <AppText variant="caption" muted>
                  残り{shoppingLeft}件
                </AppText>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'こんばんは';
  if (h < 11) return 'おはようございます';
  if (h < 18) return 'こんにちは';
  return 'こんばんは';
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hokuBadge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countPill: { minWidth: 26, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  quickCell: { width: '47.5%', flexGrow: 1, padding: 16, gap: 8, alignItems: 'flex-start' },
  quickIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
