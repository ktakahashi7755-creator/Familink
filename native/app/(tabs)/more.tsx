import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useStore, useMembers } from '../../src/store';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../src/constants/theme';
import { Avatar } from '../../src/components/ui/Avatar';

type FeatureItem = {
  id: string;
  icon: string;
  label: string;
  desc: string;
  color: string;
  route: string;
  premium?: boolean;
};

const FEATURES: FeatureItem[] = [
  { id: 'budget', icon: '💰', label: '家計管理', desc: '収支・予算を見える化', color: '#4CC9A0', route: '/budget', premium: true },
  { id: 'health', icon: '❤️', label: '体調記録', desc: '子どもの健康を記録', color: '#FF6B6B', route: '/health', premium: true },
  { id: 'shopping', icon: '🛒', label: '買い物リスト', desc: '家族で共有できるリスト', color: '#FFAB40', route: '/shopping' },
  { id: 'board', icon: '📢', label: '家族ボード', desc: 'お知らせ・連絡を共有', color: '#5B7FFF', route: '/board' },
  { id: 'hoku', icon: '🌸', label: 'Hoku', desc: 'AI家族ガイドに相談', color: Colors.primary, route: '/hoku' },
  { id: 'album', icon: '🖼️', label: 'アルバム', desc: '家族の思い出を保存', color: '#AB69D8', route: '/album', premium: true },
];

const SETTINGS: { icon: string; label: string; route: string; color: string }[] = [
  { icon: 'people-outline', label: '家族メンバー', route: '/members', color: Colors.primary },
  { icon: 'star-outline', label: 'プレミアムプラン', route: '/premium', color: Colors.warning },
  { icon: 'settings-outline', label: '設定', route: '/settings', color: Colors.textSub },
];

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useStore(s => s.user);
  const members = useMembers();
  const isPremium = useStore(s => s.isPremiumUser);
  const activeStreak = useStore(s => s.activeStreak);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>その他</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <Animated.View entering={FadeInDown.delay(50).springify().damping(18)}>
          <TouchableOpacity style={styles.profileCard} onPress={() => router.push('/settings')}>
            <Avatar name={user?.displayName ?? user?.name} color={user?.color ?? Colors.primary} size={52} uri={user?.avatarUrl ?? user?.avatar} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.displayName ?? user?.name ?? 'ユーザー'}</Text>
              <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
              {isPremium && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumBadgeText}>Premium</Text>
                </View>
              )}
            </View>
            {activeStreak > 1 && (
              <View style={styles.streakWrap}>
                <Text style={styles.streakNum}>{activeStreak}</Text>
                <Text style={styles.streakLabel}>日連続</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </Animated.View>

        {/* Features Grid */}
        <Animated.View entering={FadeInDown.delay(100).springify().damping(18)} style={styles.section}>
          <Text style={styles.sectionTitle}>機能</Text>
          <View style={styles.grid}>
            {FEATURES.map((f, i) => (
              <Animated.View key={f.id} entering={FadeInDown.delay(120 + i * 30).springify().damping(18)}>
                <TouchableOpacity
                  style={styles.gridItem}
                  onPress={() => router.push(f.route as any)}
                >
                  <View style={[styles.gridIconWrap, { backgroundColor: f.color + '18' }]}>
                    <Text style={styles.gridIcon}>{f.icon}</Text>
                    {f.premium && !isPremium && (
                      <View style={styles.premiumDot} />
                    )}
                  </View>
                  <Text style={styles.gridLabel}>{f.label}</Text>
                  <Text style={styles.gridDesc} numberOfLines={1}>{f.desc}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Premium Banner */}
        {!isPremium && (
          <Animated.View entering={FadeInDown.delay(200).springify().damping(18)}>
            <TouchableOpacity
              style={styles.premiumCard}
              onPress={() => router.push('/premium')}
            >
              <View>
                <Text style={styles.premiumTitle}>プレミアムプランで全機能を解放</Text>
                <Text style={styles.premiumSub}>家計管理・体調記録・アルバムなど</Text>
              </View>
              <View style={styles.premiumArrow}>
                <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Settings */}
        <Animated.View entering={FadeInDown.delay(250).springify().damping(18)} style={styles.section}>
          <Text style={styles.sectionTitle}>設定</Text>
          <View style={styles.settingsList}>
            {SETTINGS.map((s, i) => (
              <TouchableOpacity
                key={s.route}
                style={[
                  styles.settingsRow,
                  i < SETTINGS.length - 1 && styles.settingsRowBorder,
                ]}
                onPress={() => router.push(s.route as any)}
              >
                <View style={[styles.settingsIcon, { backgroundColor: s.color + '18' }]}>
                  <Ionicons name={s.icon as any} size={18} color={s.color} />
                </View>
                <Text style={styles.settingsLabel}>{s.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Version */}
        <Text style={styles.version}>Familink v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.base,
    backgroundColor: Colors.background,
  },
  headerTitle: { fontSize: Typography.xl, fontWeight: '700', color: Colors.text },
  scroll: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: Typography.md, fontWeight: '700', color: Colors.text },
  profileEmail: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },
  premiumBadge: {
    marginTop: 4,
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  premiumBadgeText: { fontSize: Typography.xs, color: Colors.warning, fontWeight: '700' },
  streakWrap: { alignItems: 'center', marginRight: 4 },
  streakNum: { fontSize: Typography.lg, fontWeight: '800', color: Colors.warning },
  streakLabel: { fontSize: 10, color: Colors.textMuted },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  gridItem: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  gridIconWrap: {
    width: 48, height: 48, borderRadius: Radius.xl,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  gridIcon: { fontSize: 24 },
  premiumDot: {
    position: 'absolute', top: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.warning,
    borderWidth: 2, borderColor: Colors.card,
  },
  gridLabel: { fontSize: Typography.sm, fontWeight: '700', color: Colors.text },
  gridDesc: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  premiumCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  premiumTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.primary },
  premiumSub: { fontSize: Typography.sm, color: Colors.primary + 'AA', marginTop: 2 },
  premiumArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  settingsList: { backgroundColor: Colors.card, borderRadius: Radius.xl, overflow: 'hidden', ...Shadows.sm },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.base,
    padding: Spacing.base,
  },
  settingsRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  settingsIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { flex: 1, fontSize: Typography.base, color: Colors.text },
  version: { textAlign: 'center', fontSize: Typography.xs, color: Colors.textMuted, marginTop: Spacing.base },
});
