import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { useStore, useMembers } from '../src/store';
import { Colors, Typography, Spacing, Radius, Shadows } from '../src/constants/theme';
import { Avatar } from '../src/components/ui/Avatar';
import { Sheet } from '../src/components/ui/Sheet';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { EmptyState } from '../src/components/ui/EmptyState';
import { haptic } from '../src/utils/haptics';
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
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);

  function openAdd() {
    haptic.light();
    setEditId(null);
    setName('');
    setRole('parent');
    setColor(MEMBER_COLORS[members.length % MEMBER_COLORS.length]);
    setAvatarUri(undefined);
    setShowAdd(true);
  }

  function openEdit(id: string) {
    const m = members.find(mm => mm.id === id);
    if (!m) return;
    haptic.light();
    setEditId(id);
    setName(m.name);
    setRole(m.role as any ?? 'parent');
    setColor(m.color);
    setAvatarUri(m.avatarUrl);
    setShowAdd(true);
  }

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要', '写真ライブラリへのアクセス権が必要です');
      return;
    }
    haptic.light();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as ImagePicker.MediaType,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      haptic.success();
    }
  }

  function handleSave() {
    if (!name.trim()) return;
    haptic.success();
    if (editId) {
      updateMember(editId, { name: name.trim(), role, color, avatarUrl: avatarUri });
    } else {
      addMember({
        id: 'm_' + uid(),
        name: name.trim(),
        role,
        color,
        avatarUrl: avatarUri,
        createdAt: new Date().toISOString(),
      });
    }
    setShowAdd(false);
  }

  function handleDelete(id: string) {
    haptic.warning();
    Alert.alert('メンバーを削除', 'このメンバーを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => { haptic.heavy(); deleteMember(id); },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>家族メンバー</Text>
        <TouchableOpacity onPress={openAdd} hitSlop={8}>
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

      <Sheet
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        title={editId ? 'メンバーを編集' : 'メンバーを追加'}
      >
        <View style={styles.form}>
          {/* Avatar picker */}
          <TouchableOpacity style={styles.avatarPicker} onPress={pickAvatar}>
            <Avatar name={name || '？'} color={color} size={72} uri={avatarUri} />
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera-outline" size={16} color="#fff" />
            </View>
            <Text style={styles.avatarHint}>写真を選択</Text>
          </TouchableOpacity>

          <Input
            label="名前"
            placeholder="例：田中 太郎"
            value={name}
            onChangeText={setName}
            autoFocus={!editId}
          />
          <View>
            <Text style={styles.fieldLabel}>役割</Text>
            <View style={styles.roleRow}>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.roleBtn, role === r.id && styles.roleBtnActive]}
                  onPress={() => { haptic.selection(); setRole(r.id); }}
                >
                  <Text style={[styles.roleBtnText, role === r.id && styles.roleBtnTextActive]}>
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
                  onPress={() => { haptic.selection(); setColor(c); }}
                />
              ))}
            </View>
          </View>
          <Button
            title={editId ? '保存' : '追加する'}
            onPress={handleSave}
            variant="primary"
            size="lg"
            fullWidth
          />
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
  form: { gap: Spacing.base, paddingBottom: 24 },
  avatarPicker: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  cameraOverlay: {
    position: 'absolute', top: 48, left: '50%',
    marginLeft: 16,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.card,
  },
  avatarHint: { fontSize: Typography.xs, color: Colors.primary, fontWeight: '600' },
  fieldLabel: { fontSize: Typography.sm, fontWeight: '500', color: Colors.textSub, marginBottom: 8 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  roleBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderLight,
    backgroundColor: Colors.bgMuted,
  },
  roleBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  roleBtnText: { fontSize: Typography.sm, color: Colors.textSub },
  roleBtnTextActive: { color: Colors.primary, fontWeight: '600' },
  colorRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: {
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3, shadowRadius: 2,
  },
});
