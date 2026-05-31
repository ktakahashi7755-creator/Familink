import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useStore, useMembers } from '../src/store';
import { Colors, Typography, Spacing, Radius, Shadows } from '../src/constants/theme';
import { Sheet } from '../src/components/ui/Sheet';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { Avatar } from '../src/components/ui/Avatar';
import { EmptyState } from '../src/components/ui/EmptyState';

const RECORD_TYPES = [
  { id: 'fever', label: '発熱', icon: '🌡️', color: '#FF6B6B' },
  { id: 'medicine', label: '服薬', icon: '💊', color: '#AB69D8' },
  { id: 'checkup', label: '健診', icon: '🏥', color: '#5B7FFF' },
  { id: 'vaccine', label: '予防接種', icon: '💉', color: '#4CC9A0' },
  { id: 'symptom', label: '症状', icon: '😷', color: '#FFAB40' },
  { id: 'note', label: 'メモ', icon: '📝', color: '#8E8E93' },
];

export default function HealthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const health = useStore(s => s.health);
  const addHealth = useStore(s => s.addHealth);
  const deleteHealth = useStore(s => s.deleteHealth);
  const members = useMembers();
  const isPremium = useStore(s => s.isPremiumUser);

  const [showAdd, setShowAdd] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | undefined>(members[0]?.id);
  const [recordType, setRecordType] = useState('note');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');

  const [filterMember, setFilterMember] = useState<string | undefined>(undefined);
  const filtered = filterMember ? health.filter(h => h.memberId === filterMember) : health;
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  function handleAdd() {
    if (!selectedMember) return;
    addHealth({
      memberId: selectedMember,
      type: recordType,
      value: value || undefined,
      note: note || undefined,
      date: new Date().toISOString().slice(0, 10),
    });
    setValue('');
    setNote('');
    setShowAdd(false);
  }

  if (!isPremium) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
        <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', top: insets.top + 16, left: Spacing.base }}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 48, marginBottom: Spacing.base }}>❤️</Text>
        <Text style={{ fontSize: Typography.xl, fontWeight: '700', color: Colors.text, textAlign: 'center' }}>体調記録</Text>
        <Text style={{ fontSize: Typography.base, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl }}>
          プレミアムプランで家族の体調・服薬・健診を記録できます
        </Text>
        <Button title="プレミアムを見る" onPress={() => router.push('/premium')} variant="primary" size="lg" fullWidth />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>体調記録</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)}>
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Member filter */}
      {members.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberFilter}>
          <TouchableOpacity
            style={[styles.memberChip, !filterMember && styles.memberChipActive]}
            onPress={() => setFilterMember(undefined)}
          >
            <Text style={[styles.memberChipText, !filterMember && styles.memberChipTextActive]}>全員</Text>
          </TouchableOpacity>
          {members.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[styles.memberChip, filterMember === m.id && { borderColor: m.color, backgroundColor: m.color + '18' }]}
              onPress={() => setFilterMember(m.id)}
            >
              <Avatar name={m.name} color={m.color} size={18} />
              <Text style={[styles.memberChipText, filterMember === m.id && { color: m.color, fontWeight: '600' }]}>
                {m.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon="❤️"
          title="体調記録なし"
          description="右上の + から記録を追加できます"
          actionLabel="記録を追加"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
          {sorted.map((record, i) => {
            const type = RECORD_TYPES.find(t => t.id === record.type);
            const member = members.find(m => m.id === record.memberId);
            return (
              <Animated.View key={record.id} entering={FadeInDown.delay(i * 30).springify().damping(18)}>
                <TouchableOpacity style={styles.recordCard} onLongPress={() => deleteHealth(record.id)}>
                  <View style={[styles.recordIcon, { backgroundColor: (type?.color ?? Colors.primary) + '20' }]}>
                    <Text style={{ fontSize: 20 }}>{type?.icon ?? '📝'}</Text>
                  </View>
                  <View style={styles.recordInfo}>
                    <View style={styles.recordTop}>
                      <Text style={styles.recordType}>{type?.label ?? record.type}</Text>
                      {member && (
                        <View style={styles.memberTag}>
                          <Avatar name={member.name} color={member.color} size={16} />
                          <Text style={[styles.memberTagText, { color: member.color }]}>{member.name}</Text>
                        </View>
                      )}
                    </View>
                    {record.value && <Text style={styles.recordValue}>{record.value}</Text>}
                    {record.note && <Text style={styles.recordNote}>{record.note}</Text>}
                    <Text style={styles.recordDate}>{record.date}</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      <Sheet visible={showAdd} onClose={() => setShowAdd(false)} title="体調を記録" scrollable>
        <View style={styles.addForm}>
          {members.length > 0 && (
            <View>
              <Text style={styles.fieldLabel}>対象</Text>
              <View style={styles.memberRow}>
                {members.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.memberSelectChip,
                      selectedMember === m.id && { borderColor: m.color, backgroundColor: m.color + '18' },
                    ]}
                    onPress={() => setSelectedMember(m.id)}
                  >
                    <Avatar name={m.name} color={m.color} size={22} />
                    <Text style={[styles.memberChipText, selectedMember === m.id && { color: m.color, fontWeight: '600' }]}>
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <View>
            <Text style={styles.fieldLabel}>種類</Text>
            <View style={styles.typeGrid}>
              {RECORD_TYPES.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeChip, recordType === t.id && { borderColor: t.color, backgroundColor: t.color + '20' }]}
                  onPress={() => setRecordType(t.id)}
                >
                  <Text style={{ fontSize: 16 }}>{t.icon}</Text>
                  <Text style={[styles.typeLabel, recordType === t.id && { color: t.color, fontWeight: '600' }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Input
            label="値（任意）"
            placeholder="例: 37.5°C"
            value={value}
            onChangeText={setValue}
          />
          <Input
            label="メモ（任意）"
            placeholder="詳細を入力"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
          />
          <Text style={styles.disclaimer}>
            ※ この記録は記録支援のためのものです。医療診断の代替ではありません。体調不良が続く場合は医療機関にご相談ください。
          </Text>
          <Button title="記録する" onPress={handleAdd} variant="primary" size="lg" fullWidth />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm,
  },
  headerTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text },
  memberFilter: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm, gap: Spacing.sm },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderLight,
    backgroundColor: Colors.card,
  },
  memberChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  memberChipText: { fontSize: Typography.sm, color: Colors.textSub },
  memberChipTextActive: { color: Colors.primary, fontWeight: '600' },
  list: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, gap: Spacing.sm },
  recordCard: {
    backgroundColor: Colors.card, borderRadius: Radius.xl,
    flexDirection: 'row', gap: Spacing.sm, padding: Spacing.base, ...Shadows.sm,
  },
  recordIcon: { width: 44, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  recordInfo: { flex: 1 },
  recordTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  recordType: { fontSize: Typography.base, fontWeight: '600', color: Colors.text },
  memberTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberTagText: { fontSize: Typography.xs, fontWeight: '500' },
  recordValue: { fontSize: Typography.md, fontWeight: '700', color: Colors.text, marginTop: 2 },
  recordNote: { fontSize: Typography.sm, color: Colors.textSub, marginTop: 2 },
  recordDate: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 4 },
  addForm: { gap: Spacing.base, paddingBottom: 20 },
  fieldLabel: { fontSize: Typography.sm, fontWeight: '500', color: Colors.textSub, marginBottom: 8 },
  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  memberSelectChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderLight,
    backgroundColor: Colors.bgMuted,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderLight,
    backgroundColor: Colors.bgMuted,
  },
  typeLabel: { fontSize: Typography.sm, color: Colors.textSub },
  disclaimer: {
    fontSize: Typography.xs, color: Colors.textMuted,
    lineHeight: Typography.xs * 1.6,
    backgroundColor: Colors.bgMuted,
    padding: Spacing.sm, borderRadius: Radius.md,
  },
});
