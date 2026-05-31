import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useStore, useTasks, useMembers } from '../../src/store';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../src/constants/theme';
import { Avatar } from '../../src/components/ui/Avatar';
import { EmptyState } from '../../src/components/ui/EmptyState';
import type { Task } from '../../src/types';

type Filter = 'all' | 'mine' | 'urgent' | 'done';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'mine', label: '自分' },
  { id: 'urgent', label: '急ぎ' },
  { id: 'done', label: '完了' },
];

export default function TasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tasks = useTasks();
  const members = useMembers();
  const user = useStore(s => s.user);
  const toggleTask = useStore(s => s.toggleTask);
  const deleteTask = useStore(s => s.deleteTask);
  const [filter, setFilter] = useState<Filter>('all');

  const currentMember = members.find(m => m.userId === user?.id);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'mine':
        return tasks.filter(t => !t.done && t.assigneeId === currentMember?.id);
      case 'urgent':
        return tasks.filter(t => !t.done && t.priority === 'high');
      case 'done':
        return tasks.filter(t => t.done);
      default:
        return tasks.filter(t => !t.done);
    }
  }, [tasks, filter, currentMember]);

  const pending = tasks.filter(t => !t.done).length;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.headerTitle}>タスク</Text>
          {pending > 0 && (
            <Text style={styles.headerSub}>{pending}件 未完了</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/modals/task-edit')}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterTab, filter === f.id && styles.filterTabActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.filterLabel, filter === f.id && styles.filterLabelActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Task list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="✅"
          title={filter === 'done' ? '完了タスクなし' : 'タスクなし'}
          description={filter === 'done' ? 'タスクを完了させましょう' : '右上の + からタスクを追加できます'}
          actionLabel={filter !== 'done' ? 'タスクを追加' : undefined}
          onAction={filter !== 'done' ? () => router.push('/modals/task-edit') : undefined}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((task, i) => (
            <Animated.View
              key={task.id}
              entering={FadeInDown.delay(i * 30).springify().damping(18)}
              layout={Layout.springify()}
            >
              <TaskItem
                task={task}
                members={members}
                onToggle={() => toggleTask(task.id)}
                onDelete={() => deleteTask(task.id)}
              />
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function TaskItem({
  task,
  members,
  onToggle,
  onDelete,
}: {
  task: Task;
  members: any[];
  onToggle: () => void;
  onDelete: () => void;
}) {
  const assignee = members.find(m => m.id === task.assigneeId);

  const priorityColor =
    task.priority === 'high' ? Colors.error
    : task.priority === 'medium' ? Colors.warning
    : Colors.border;

  return (
    <TouchableOpacity style={styles.taskCard} onLongPress={onDelete} activeOpacity={0.8}>
      <TouchableOpacity onPress={onToggle} style={styles.checkWrap} hitSlop={8}>
        <View style={[styles.check, task.done && styles.checkDone, { borderColor: priorityColor }]}>
          {task.done && <Ionicons name="checkmark" size={13} color="#fff" />}
        </View>
      </TouchableOpacity>

      <View style={styles.taskBody}>
        <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.taskMeta}>
          {task.dueDate && (
            <View style={styles.metaChip}>
              <Ionicons name="calendar-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.metaText}>{task.dueDate}</Text>
            </View>
          )}
          {task.priority === 'high' && (
            <View style={[styles.metaChip, { backgroundColor: Colors.errorLight }]}>
              <Text style={[styles.metaText, { color: Colors.error, fontWeight: '600' }]}>急ぎ</Text>
            </View>
          )}
        </View>
      </View>

      {assignee && (
        <Avatar name={assignee.name} color={assignee.color} size={28} uri={assignee.avatarUrl} />
      )}
    </TouchableOpacity>
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
  headerSub: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  filters: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterLabel: { fontSize: Typography.sm, color: Colors.textSub, fontWeight: '500' },
  filterLabelActive: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, gap: Spacing.sm },
  taskCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  checkWrap: {},
  check: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  taskBody: { flex: 1 },
  taskTitle: { fontSize: Typography.base, color: Colors.text, fontWeight: '500' },
  taskTitleDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  taskMeta: { flexDirection: 'row', gap: Spacing.xs, marginTop: 4, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.bgMuted,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  metaText: { fontSize: Typography.xs, color: Colors.textMuted },
});
