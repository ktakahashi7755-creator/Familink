import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, Layout, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useStore, useTasks, useMembers } from '../../src/store';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../src/constants/theme';
import { Avatar } from '../../src/components/ui/Avatar';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { haptic } from '../../src/utils/haptics';
import type { Task } from '../../src/types';

type Filter = 'all' | 'mine' | 'urgent' | 'done';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'mine', label: '自分' },
  { id: 'urgent', label: '急ぎ' },
  { id: 'done', label: '完了' },
];

const DELETE_THRESHOLD = 80;

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

  const handleFilterChange = (f: Filter) => {
    haptic.selection();
    setFilter(f);
  };

  const handleToggle = useCallback((id: string, done: boolean) => {
    if (!done) {
      haptic.success();
    } else {
      haptic.light();
    }
    toggleTask(id);
  }, [toggleTask]);

  const handleDelete = useCallback((id: string, title: string) => {
    haptic.warning();
    Alert.alert('タスクを削除', `「${title}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          haptic.heavy();
          deleteTask(id);
        },
      },
    ]);
  }, [deleteTask]);

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
          onPress={() => {
            haptic.light();
            router.push('/modals/task-edit');
          }}
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
            onPress={() => handleFilterChange(f.id)}
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
                onToggle={() => handleToggle(task.id, task.done)}
                onDelete={() => handleDelete(task.id, task.title)}
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
  const translateX = useSharedValue(0);

  const priorityColor =
    task.priority === 'high' ? Colors.error
    : task.priority === 'medium' ? Colors.warning
    : Colors.border;

  const pan = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-8, 8])
    .onUpdate(e => {
      translateX.value = Math.max(Math.min(e.translationX, 0), -DELETE_THRESHOLD - 20);
    })
    .onEnd(e => {
      if (e.translationX < -DELETE_THRESHOLD) {
        translateX.value = withSpring(-DELETE_THRESHOLD, { damping: 18 });
      } else {
        translateX.value = withSpring(0, { damping: 18 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteReveal = useAnimatedStyle(() => ({
    width: -translateX.value,
    opacity: -translateX.value > 10 ? 1 : 0,
  }));

  const close = useCallback(() => {
    translateX.value = withSpring(0, { damping: 18 });
  }, [translateX]);

  return (
    <View style={styles.swipeContainer}>
      {/* Delete action revealed by swipe */}
      <Animated.View style={[styles.deleteAction, deleteReveal]}>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => { close(); onDelete(); }}
        >
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.deleteText}>削除</Text>
        </TouchableOpacity>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.taskCard, cardStyle]}>
          <TouchableOpacity onPress={onToggle} style={styles.checkWrap} hitSlop={10}>
            <View style={[styles.check, task.done && styles.checkDone, { borderColor: priorityColor }]}>
              {task.done && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
          </TouchableOpacity>

          <View style={styles.taskBody}>
            <Text
              style={[styles.taskTitle, task.done && styles.taskTitleDone]}
              numberOfLines={2}
            >
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
              {task.priority === 'medium' && (
                <View style={[styles.metaChip, { backgroundColor: Colors.warning + '20' }]}>
                  <Text style={[styles.metaText, { color: Colors.warning, fontWeight: '600' }]}>普通</Text>
                </View>
              )}
            </View>
          </View>

          {assignee && (
            <Avatar name={assignee.name} color={assignee.color} size={28} uri={assignee.avatarUrl} />
          )}
        </Animated.View>
      </GestureDetector>
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
  headerSub: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  filters: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm, gap: Spacing.sm },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  filterTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterLabel: { fontSize: Typography.sm, color: Colors.textSub, fontWeight: '500' },
  filterLabelActive: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, gap: Spacing.sm },
  swipeContainer: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  deleteAction: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    backgroundColor: Colors.error,
    overflow: 'hidden',
  },
  deleteBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16, gap: 3,
  },
  deleteText: { fontSize: Typography.xs, color: '#fff', fontWeight: '600' },
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
