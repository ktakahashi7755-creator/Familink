import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore, useMembers } from '../../src/store';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Avatar } from '../../src/components/ui/Avatar';

const EVENT_COLORS = ['#5B7FFF', '#FF6B6B', '#4CC9A0', '#FFAB40', '#AB69D8', '#0A84FF', '#FF3B30', '#34C759'];

export default function EventEditModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, date: preDate } = useLocalSearchParams<{ id?: string; date?: string }>();
  const events = useStore(s => s.events);
  const addEvent = useStore(s => s.addEvent);
  const updateEvent = useStore(s => s.updateEvent);
  const deleteEvent = useStore(s => s.deleteEvent);
  const members = useMembers();

  const existing = id ? events.find(e => e.id === id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing?.date ?? preDate ?? new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(existing?.time ?? '');
  const [place, setPlace] = useState(existing?.place ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [color, setColor] = useState(existing?.color ?? Colors.primary);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(existing?.memberIds ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleMember(id: string) {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'タイトルを入力してください';
    if (!date) e.date = '日付を入力してください';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const data = {
      title: title.trim(),
      date,
      time: time || undefined,
      place: place || undefined,
      note: note || undefined,
      color,
      memberIds: selectedMembers,
      type: 'event' as const,
    };
    if (existing) {
      updateEvent(existing.id, data);
    } else {
      addEvent(data);
    }
    router.back();
  }

  function handleDelete() {
    if (existing) {
      deleteEvent(existing.id);
    }
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
        {/* Handle */}
        <View style={styles.grip} />

        {/* Toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelBtn}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>{existing ? '予定を編集' : '新しい予定'}</Text>
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
            label="タイトル"
            placeholder="例：運動会、保護者会"
            value={title}
            onChangeText={setTitle}
            autoFocus={!existing}
            error={errors.title}
          />
          <Input
            label="日付"
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
            error={errors.date}
          />
          <Input
            label="時間（任意）"
            placeholder="例：10:00"
            value={time}
            onChangeText={setTime}
          />
          <Input
            label="場所（任意）"
            placeholder="例：学校体育館"
            value={place}
            onChangeText={setPlace}
          />
          <Input
            label="メモ（任意）"
            placeholder="備考や詳細を入力"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
          />

          {/* Color picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>カラー</Text>
            <View style={styles.colorRow}>
              {EVENT_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>
          </View>

          {/* Member selector */}
          {members.length > 0 && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>参加メンバー</Text>
              <View style={styles.memberRow}>
                {members.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.memberChip,
                      selectedMembers.includes(m.id) && { borderColor: m.color, backgroundColor: m.color + '18' },
                    ]}
                    onPress={() => toggleMember(m.id)}
                  >
                    <Avatar name={m.name} color={m.color} size={24} />
                    <Text style={[
                      styles.memberName,
                      selectedMembers.includes(m.id) && { color: m.color, fontWeight: '600' },
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
              title="この予定を削除"
              onPress={handleDelete}
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
  colorRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  colorDotSelected: { borderWidth: 3, borderColor: Colors.card, outlineWidth: 2 },
  memberRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderLight,
    backgroundColor: Colors.bgMuted,
  },
  memberName: { fontSize: Typography.sm, color: Colors.textSub },
});
