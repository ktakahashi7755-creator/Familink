import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useStore } from '../src/store';
import { Colors, Typography, Spacing, Radius, Shadows } from '../src/constants/theme';
import { Avatar } from '../src/components/ui/Avatar';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { Sheet } from '../src/components/ui/Sheet';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useStore(s => s.user);
  const logout = useStore(s => s.logout);
  const setUserProfile = useStore(s => s.setUserProfile);
  const isPremium = useStore(s => s.isPremiumUser);
  const [showEdit, setShowEdit] = useState(false);
  const [name, setName] = useState(user?.displayName ?? user?.name ?? '');

  function handleSaveName() {
    if (name.trim()) {
      setUserProfile({ displayName: name.trim() });
    }
    setShowEdit(false);
  }

  function handleLogout() {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/welcome'); } },
    ]);
  }

  type SettingsItem = { icon: string; label: string; action: () => void; badge?: string; value?: string };
  const SECTIONS: { title: string; items: SettingsItem[] }[] = [
    {
      title: 'アカウント',
      items: [
        { icon: 'person-outline', label: 'プロフィールを編集', action: () => setShowEdit(true) },
        { icon: 'people-outline', label: '家族メンバー', action: () => router.push('/members') },
        { icon: 'star-outline', label: 'プレミアムプラン', action: () => router.push('/premium'), badge: isPremium ? 'Premium' : undefined },
      ],
    },
    {
      title: 'アプリ設定',
      items: [
        { icon: 'notifications-outline', label: '通知設定', action: () => {} },
        { icon: 'moon-outline', label: 'ダークモード', action: () => {} },
        { icon: 'language-outline', label: '言語', action: () => {}, value: '日本語' },
      ],
    },
    {
      title: 'サポート',
      items: [
        { icon: 'help-circle-outline', label: 'ヘルプ・よくある質問', action: () => {} },
        { icon: 'mail-outline', label: 'フィードバックを送る', action: () => {} },
        { icon: 'document-text-outline', label: '利用規約', action: () => {} },
        { icon: 'shield-outline', label: 'プライバシーポリシー', action: () => {} },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>設定</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <Animated.View entering={FadeInDown.delay(50).springify().damping(18)}>
          <TouchableOpacity style={styles.profileCard} onPress={() => setShowEdit(true)}>
            <Avatar name={user?.displayName ?? user?.name} color={user?.color ?? Colors.primary} size={56} uri={user?.avatarUrl ?? user?.avatar} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.displayName ?? user?.name ?? 'ユーザー'}</Text>
              <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </Animated.View>

        {/* Sections */}
        {SECTIONS.map((section, si) => (
          <Animated.View
            key={section.title}
            entering={FadeInDown.delay(100 + si * 50).springify().damping(18)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionList}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.settingsRow,
                    ii < section.items.length - 1 && styles.settingsRowBorder,
                  ]}
                  onPress={item.action}
                >
                  <View style={styles.settingsIcon}>
                    <Ionicons name={item.icon as any} size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.settingsLabel}>{item.label}</Text>
                  {item.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                  {item.value && (
                    <Text style={styles.settingsValue}>{item.value}</Text>
                  )}
                  <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        ))}

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(300).springify().damping(18)}>
          <Button
            title="ログアウト"
            onPress={handleLogout}
            variant="outline"
            size="lg"
            fullWidth
          />
        </Animated.View>

        <Text style={styles.version}>Familink v1.0.0 (1)</Text>
      </ScrollView>

      <Sheet visible={showEdit} onClose={() => setShowEdit(false)} title="プロフィールを編集">
        <View style={styles.editForm}>
          <Input
            label="名前"
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <Button title="保存" onPress={handleSaveName} variant="primary" size="lg" fullWidth />
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
  scroll: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm },
  profileCard: {
    backgroundColor: Colors.card, borderRadius: Radius.xl,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.base,
    padding: Spacing.base, marginBottom: Spacing.xl, ...Shadows.sm,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: Typography.md, fontWeight: '700', color: Colors.text },
  profileEmail: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textMuted, marginBottom: Spacing.sm },
  sectionList: { backgroundColor: Colors.card, borderRadius: Radius.xl, overflow: 'hidden', ...Shadows.sm },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.base,
  },
  settingsRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  settingsIcon: {
    width: 34, height: 34, borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  settingsLabel: { flex: 1, fontSize: Typography.base, color: Colors.text },
  settingsValue: { fontSize: Typography.sm, color: Colors.textMuted, marginRight: 4 },
  badge: {
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.full,
    marginRight: 4,
  },
  badgeText: { fontSize: Typography.xs, color: Colors.warning, fontWeight: '700' },
  editForm: { gap: Spacing.base, paddingBottom: 20 },
  version: { textAlign: 'center', fontSize: Typography.xs, color: Colors.textMuted, marginTop: Spacing.xl },
});
