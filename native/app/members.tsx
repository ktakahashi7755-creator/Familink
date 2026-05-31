import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useStore, useMembers } from '../src/store';
import { Colors, Typography, Spacing, Radius, Shadows } from '../src/constants/theme';
import { Avatar } from '../src/components/ui/Avatar';
import { Sheet } from '../src/components/ui/Sheet';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { EmptyState } from '../src/components/ui/EmptyState';
import { uid } from '../src/utils/date';

const MEMBER_COLORS: string[] = [...Colors.memberColors];
const ROLES = [
  { id: 'parent', label: 'パパ・ママ' },
  { id: 'child', label: '子ども' },
  { id: 'grandparent', label: '祖父母' },
  { id: 'other', label: 'その他' },
] as const;

export default function MembersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const members = useMembers();
  const addMember = useStore(s => s.addMember);
  const updateMember = useStore(s => s.updateMember);
  const deleteMember = useStore(s => s.deleteMember);

  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'parent' | 'child' | 'grandparent' | 'other'>('parent');
  const [color, setColor] = useState<string>(MEMBER_COLORS[0] ?? '#5B7FFF');

  const editMember = editId ? members.find(m => m.id === editId) : null;

  function openAdd() {
    setEditId(null);
    setName('');
    setRole('parent');
    setColor(MEMBER_COLORS[members.length % MEMBER_COLORS.length]);
    setShowAdd(true);
  }

  function openEdit(id: string) {
    const m = members.find(mm => mm.id === id);
    if (!m) return;
    setEditId(id);
    setName(m.name);
    setRole(m.role as any ?? 'parent');
    setColor(m.color);
    setShowAdd(true);
  }

  function handleSave() {
    if (!name.trim()) return;
    if (editId) {
      updateMember(editId, { name: name.trim(), role, color });
    } else {
      addMember({
        id: 'm_' + uid(),
        name: name.trim(),
        role,
        color,
        createdAt: new Date().toISOString(),
      });
    }
    setShowAdd(false);
  }

  function handleDelete(id: string) {
    Alert.alert('メンバーを削除', 'このメンバーを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => deleteMember(id) },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>家族メンバー</Text>
        <TouchableOpacity onPress={openAdd}>
          <Ionicons name="person-add" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {members.length === 0 ? (
        <EmptyState
          icon="👨‍👩‍👧‍👦"
          title="メンバーを追加しましょう"
          description="家族のメンバーを追加すると予定やタスクを割り当てられます"
          actionLabel="メンバーを追加"
          onAction={openAdd}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {members.map((member, i) => (
            <Animated.View
              key={member.id}
              entering={FadeInDown.delay(i * 40).springify().damping(18)}
              layout={Layout.springify()}
            >
              <TouchableOpacity style={styles.memberCard} onPress={() => openEdit(member.id)}>
                <Avatar name={member.name} color={member.color} size={48} uri={member.avatarUrl} />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberRole}>
                    {ROLES.find(r => r.id === member.role)?.label ?? member.role}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(member.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      )}

      <Sheet visible={showAdd} onClose={() => setShowAdd(false)} title={editId ? 'メンバーを編集' : 'メンバーを追加'}>
        <View style={styles.form}>
          <Input
            label="名前"
            placeholder="例：田中 太郎"
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <View>
            <Text style={styles.fieldLabel}>役割</Text>
            <View style={styles.roleRow}>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.roleBtn, role === r.id && { backgroundColor: Colors.primaryLight, borderColor: Colors.primary }]}
                  onPress={() => setRole(r.id)}
                >
                  <Text style={[styles.roleBtnText, role === r.id && { color: Colors.primary, fontWeight: '600' }]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View>
            <Text style={styles.fieldLabel}>カラー</Text>
            <View style={styles.colorRow}>
              {MEMBER_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    color === c && styles.colorDotSelected,
                  ]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>
          </View>
          {/* Preview */}
          <View style={styles.preview}>
            <Avatar name={name || '？'} color={color} size={52} />
            <Text style={styles.previewName}>{name || '名前なし'}</Text>
          </View>
          <Button title={editId ? '保存' : '追加する'} onPress={handleSave} variant="primary" size="lg" fullWidth />
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
  list: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, gap: Spacing.sm },
  memberCard: {
    backgroundColor: Colors.card, borderRadius: Radius.xl,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.base,
    padding: Spacing.base, ...Shadows.sm,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: Typography.base, fontWeight: '600', color: Colors.text },
  memberRole: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },
  form: { gap: Spacing.base, paddingBottom: 20 },
  fieldLabel: { fontSize: Typography.sm, fontWeight: '500', color: Colors.textSub, marginBottom: 8 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  roleBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderLight,
    backgroundColor: Colors.bgMuted,
  },
  roleBtnText: { fontSize: Typography.sm, color: Colors.textSub },
  colorRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2 },
  preview: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  previewName: { fontSize: Typography.base, fontWeight: '600', color: Colors.text },
});
