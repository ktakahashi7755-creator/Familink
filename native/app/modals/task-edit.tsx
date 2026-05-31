import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, useTasks, useMembers } from '../../src/store';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Avatar } from '../../src/components/ui/Avatar';

type Priority = 'low' | 'medium' | 'high';

const PRIORITIES: { id: Priority; label: string; color: string }[] = [
  { id: 'low', label: '低', color: Colors.border },
  { id: 'medium', label: '中', color: Colors.warning },
  { id: 'high', label: '高', color: Colors.error },
];

export default function TaskEditModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const tasks = useTasks();
  const members = useMembers();
  const addTask = useStore(s => s.addTask);
  const updateTask = useStore(s => s.updateTask);
  const deleteTask = useStore(s => s.deleteTask);

  const existing = id ? tasks.find(t => t.id === id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? '');
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 'low');
  const [assigneeId, setAssigneeId] = useState<string | undefined>(existing?.assigneeId);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'タスク名を入力してください';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const data = {
      title: title.trim(),
      note: note || undefined,
      dueDate: dueDate || undefined,
      priority,
      assigneeId,
      done: false,
    };
    if (existing) {
      updateTask(existing.id, data);
    } else {
      addTask(data);
    }
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.grip} />

        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelBtn}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>{existing ? 'タスクを編集' : '新しいタスク'}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.doneBtn}>完了</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Input
            label="タスク名"
            placeholder="例：学校の連絡帳を確認する"
            value={title}
            onChangeText={setTitle}
            autoFocus={!existing}
            error={errors.title}
          />
          <Input
            label="メモ（任意）"
            placeholder="詳細や備考"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
          />
          <Input
            label="期日（任意）"
            placeholder="YYYY-MM-DD"
            value={dueDate}
            onChangeText={setDueDate}
          />

          {/* Priority */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>優先度</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.priorityBtn,
                    priority === p.id && { backgroundColor: p.color + '20', borderColor: p.color },
                  ]}
                  onPress={() => setPriority(p.id)}
                >
                  <Text style={[
                    styles.priorityLabel,
                    priority === p.id && { color: p.color, fontWeight: '700' },
                  ]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Assignee */}
          {members.length > 0 && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>担当者</Text>
              <View style={styles.memberRow}>
                <TouchableOpacity
                  style={[styles.memberChip, !assigneeId && styles.memberChipSelected]}
                  onPress={() => setAssigneeId(undefined)}
                >
                  <Text style={[styles.memberName, !assigneeId && { color: Colors.primary, fontWeight: '600' }]}>
                    なし
                  </Text>
                </TouchableOpacity>
                {members.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.memberChip,
                      assigneeId === m.id && { borderColor: m.color, backgroundColor: m.color + '18' },
                    ]}
                    onPress={() => setAssigneeId(m.id)}
                  >
                    <Avatar name={m.name} color={m.color} size={22} />
                    <Text style={[
                      styles.memberName,
                      assigneeId === m.id && { color: m.color, fontWeight: '600' },
                    ]}>
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {existing && (
            <Button
              title="このタスクを削除"
              onPress={() => { deleteTask(existing.id); router.back(); }}
              variant="danger"
              size="md"
              fullWidth
            />
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.card },
  grip: {
    alignSelf: 'center', width: 36, height: 4,
    borderRadius: 2, backgroundColor: Colors.border,
    marginTop: 10, marginBottom: 8,
  },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight,
  },
  cancelBtn: { fontSize: Typography.base, color: Colors.textSub },
  toolbarTitle: { fontSize: Typography.base, fontWeight: '600', color: Colors.text },
  doneBtn: { fontSize: Typography.base, color: Colors.primary, fontWeight: '700' },
  form: { padding: Spacing.base, gap: Spacing.base, paddingBottom: 40 },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: Typography.sm, fontWeight: '500', color: Colors.textSub },
  priorityRow: { flexDirection: 'row', gap: Spacing.sm },
  priorityBtn: {
    flex: 1, paddingVertical: 10, borderRadius: Radius.md,
    alignItems: 'center', borderWidth: 1.5, borderColor: Colors.borderLight,
    backgroundColor: Colors.bgMuted,
  },
  priorityLabel: { fontSize: Typography.sm, color: Colors.textSub },
  memberRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderLight,
    backgroundColor: Colors.bgMuted,
  },
  memberChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  memberName: { fontSize: Typography.sm, color: Colors.textSub },
});
