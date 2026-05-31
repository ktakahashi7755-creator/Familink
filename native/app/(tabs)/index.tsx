import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useStore, useMembers, useEvents, useTasks } from '../../src/store';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../src/constants/theme';
import { Avatar } from '../../src/components/ui/Avatar';
import { formatDate, todayStr } from '../../src/utils/date';

const QUICK_ACTIONS = [
  { id: 'event', icon: 'calendar-outline', label: '予定追加', color: '#5B7FFF', route: '/modals/event-edit' },
  { id: 'task', icon: 'checkmark-circle-outline', label: 'タスク追加', color: '#4CC9A0', route: '/modals/task-edit' },
  { id: 'memo', icon: 'document-text-outline', label: 'メモ追加', color: '#FFAB40', route: '/modals/memo-edit' },
  { id: 'hoku', icon: 'sparkles-outline', label: 'Hoku', color: Colors.primary, route: '/hoku' },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useStore(s => s.user);
  const members = useMembers();
  const events = useEvents();
  const tasks = useTasks();
  const activeStreak = useStore(s => s.activeStreak);
  const isPremium = useStore(s => s.isPremiumUser);

  const today = todayStr();
  const todayEvents = events
    .filter(e => e.date === today || e.startDate === today)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  const pendingTasks = tasks.filter(t => !t.done).slice(0, 5);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'おはようございます' : hour < 17 ? 'こんにちは' : 'こんばんは';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.userName}>{user?.displayName ?? user?.name ?? 'ファミリー'} さん</Text>
        </View>
        <View style={styles.headerRight}>
          {activeStreak > 1 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {activeStreak}日</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => router.push('/settings')}>
            <Avatar name={user?.displayName ?? user?.name} color={user?.color ?? Colors.primary} size={36} uri={user?.avatarUrl ?? user?.avatar} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hoku Card */}
        <Animated.View entering={FadeInDown.delay(50).springify().damping(18)}>
          <TouchableOpacity style={styles.hokuCard} onPress={() => router.push('/hoku')}>
            <View style={styles.hokuLeft}>
              <Text style={styles.hokuIcon}>🌸</Text>
              <View>
                <Text style={styles.hokuName}>Hoku</Text>
                <Text style={styles.hokuMsg}>
                  {todayEvents.length > 0
                    ? `今日は ${todayEvents.length} 件の予定があります`
                    : pendingTasks.length > 0
                      ? `${pendingTasks.length} 件のタスクが待っています`
                      : '今日も素敵な一日になりますように'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(100).springify().damping(18)} style={styles.section}>
          <Text style={styles.sectionTitle}>クイックアクション</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map(action => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickItem}
                onPress={() => router.push(action.route as any)}
              >
                <View style={[styles.quickIconWrap, { backgroundColor: action.color + '18' }]}>
                  <Ionicons name={action.icon as any} size={22} color={action.color} />
                </View>
                <Text style={styles.quickLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Family Members */}
        {members.length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).springify().damping(18)} style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>家族メンバー</Text>
              <TouchableOpacity onPress={() => router.push('/members')}>
                <Text style={styles.seeAll}>管理</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.membersRow}>
              {members.map(m => (
                <View key={m.id} style={styles.memberChip}>
                  <Avatar name={m.name} color={m.color} size={40} uri={m.avatarUrl} />
                  <Text style={styles.memberName} numberOfLines={1}>{m.name}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.memberAddChip} onPress={() => router.push('/members')}>
                <View style={styles.memberAddIcon}>
                  <Ionicons name="person-add-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.memberName}>追加</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Today's Schedule */}
        <Animated.View entering={FadeInDown.delay(200).springify().damping(18)} style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>今日の予定</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/calendar')}>
              <Text style={styles.seeAll}>すべて見る</Text>
            </TouchableOpacity>
          </View>
          {todayEvents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>今日の予定はありません</Text>
              <TouchableOpacity onPress={() => router.push('/modals/event-edit')}>
                <Text style={styles.emptyAction}>予定を追加する</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cardList}>
              {todayEvents.map((e, i) => (
                <Animated.View
                  key={e.id}
                  entering={FadeInDown.delay(220 + i * 40).springify().damping(18)}
                >
                  <TouchableOpacity style={styles.eventRow}>
                    <View style={[styles.eventDot, { backgroundColor: e.color ?? Colors.primary }]} />
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle}>{e.title}</Text>
                      {e.time && <Text style={styles.eventTime}>{e.time}</Text>}
                    </View>
                    {e.memberIds && e.memberIds.length > 0 && (
                      <View style={styles.eventMembers}>
                        {e.memberIds.slice(0, 3).map(mid => {
                          const m = members.find(mm => mm.id === mid);
                          return m ? (
                            <Avatar key={mid} name={m.name} color={m.color} size={22} />
                          ) : null;
                        })}
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Pending Tasks */}
        <Animated.View entering={FadeInDown.delay(250).springify().damping(18)} style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>タスク</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
              <Text style={styles.seeAll}>すべて見る</Text>
            </TouchableOpacity>
          </View>
          {pendingTasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>未完了のタスクはありません</Text>
              <TouchableOpacity onPress={() => router.push('/modals/task-edit')}>
                <Text style={styles.emptyAction}>タスクを追加する</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cardList}>
              {pendingTasks.map((t, i) => (
                <TaskRow key={t.id} task={t} index={i} members={members} />
              ))}
            </View>
          )}
        </Animated.View>

        {/* Premium Banner */}
        {!isPremium && (
          <Animated.View entering={FadeInDown.delay(300).springify().damping(18)}>
            <TouchableOpacity
              style={styles.premiumBanner}
              onPress={() => router.push('/premium')}
            >
              <View>
                <Text style={styles.premiumTitle}>プレミアムにアップグレード</Text>
                <Text style={styles.premiumDesc}>家計管理・体調記録など全機能が使えます</Text>
              </View>
              <Text style={styles.premiumPrice}>¥480/月</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function TaskRow({ task, index, members }: { task: any; index: number; members: any[] }) {
  const toggleTask = useStore(s => s.toggleTask);
  return (
    <Animated.View entering={FadeInDown.delay(270 + index * 40).springify().damping(18)}>
      <TouchableOpacity style={styles.taskRow} onPress={() => toggleTask(task.id)}>
        <View style={[styles.taskCheck, task.done && styles.taskCheckDone]}>
          {task.done && <Ionicons name="checkmark" size={12} color="#fff" />}
        </View>
        <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]} numberOfLines={1}>
          {task.title}
        </Text>
        {task.assigneeId && (
          <View style={styles.taskAssignee}>
            {(() => {
              const m = members.find(mm => mm.id === task.assigneeId);
              return m ? <Avatar name={m.name} color={m.color} size={20} /> : null;
            })()}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
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
  headerLeft: {},
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  greeting: { fontSize: Typography.sm, color: Colors.textMuted },
  userName: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text, marginTop: 2 },
  streakBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  streakText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.warning },
  scroll: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm },
  hokuCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
    ...Shadows.sm,
  },
  hokuLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  hokuIcon: { fontSize: 32 },
  hokuName: { fontSize: Typography.sm, fontWeight: '600', color: Colors.primary, marginBottom: 2 },
  hokuMsg: { fontSize: Typography.sm, color: Colors.textSub, flex: 1 },
  section: { marginBottom: Spacing.xl },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.text },
  seeAll: { fontSize: Typography.sm, color: Colors.primary, fontWeight: '600' },
  quickGrid: { flexDirection: 'row', gap: Spacing.sm },
  quickItem: { flex: 1, alignItems: 'center', gap: 6 },
  quickIconWrap: {
    width: 56, height: 56, borderRadius: Radius.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: { fontSize: Typography.xs, color: Colors.textSub, fontWeight: '600', textAlign: 'center' },
  membersRow: { flexDirection: 'row', gap: Spacing.base, flexWrap: 'wrap' },
  memberChip: { alignItems: 'center', gap: 6, width: 56 },
  memberAddChip: { alignItems: 'center', gap: 6, width: 56 },
  memberAddIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  memberName: { fontSize: 11, color: Colors.textSub, textAlign: 'center' },
  cardList: { backgroundColor: Colors.card, borderRadius: Radius.xl, overflow: 'hidden', ...Shadows.sm },
  emptyCard: {
    backgroundColor: Colors.card, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, ...Shadows.sm,
  },
  emptyText: { fontSize: Typography.sm, color: Colors.textMuted },
  emptyAction: { fontSize: Typography.sm, color: Colors.primary, fontWeight: '600' },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight,
  },
  eventDot: { width: 10, height: 10, borderRadius: 5 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: Typography.base, fontWeight: '500', color: Colors.text },
  eventTime: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  eventMembers: { flexDirection: 'row', gap: -6 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight,
  },
  taskCheck: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  taskCheckDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  taskTitle: { flex: 1, fontSize: Typography.base, color: Colors.text },
  taskTitleDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  taskAssignee: {},
  premiumBanner: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  premiumTitle: { fontSize: Typography.base, fontWeight: '700', color: '#fff' },
  premiumDesc: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  premiumPrice: { fontSize: Typography.md, fontWeight: '800', color: '#fff' },
});
