import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useStore } from '../src/store';
import { Colors, Typography, Spacing, Radius, Shadows } from '../src/constants/theme';
import { Button } from '../src/components/ui/Button';

const FREE_FEATURES = [
  '予定共有（月20件まで）',
  'タスク管理（20件まで）',
  'メモ（10件まで）',
  'Hokuのサポート（基本）',
  '家族メンバー3名まで',
];

const PREMIUM_FEATURES = [
  { icon: '✅', label: '予定・タスク 無制限' },
  { icon: '📝', label: 'メモ・フォルダ 無制限' },
  { icon: '💰', label: '家計管理・予算設定' },
  { icon: '❤️', label: '体調記録・服薬管理' },
  { icon: '🖼️', label: 'アルバム（写真保存）' },
  { icon: '👨‍👩‍👧‍👦', label: '家族メンバー 無制限' },
  { icon: '🌸', label: 'Hoku フル機能' },
  { icon: '🔔', label: 'プッシュ通知' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isPremium = useStore(s => s.isPremiumUser);
  const activatePremium = useStore(s => s.activatePremium);
  const startTrial = useStore(s => s.startTrial);
  const trialStartedAt = useStore(s => s.trialStartedAt);

  const trialAvailable = !trialStartedAt && !isPremium;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プレミアムプラン</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View entering={FadeInDown.delay(50).springify().damping(18)} style={styles.hero}>
          <Text style={styles.heroEmoji}>🌸</Text>
          <Text style={styles.heroTitle}>
            {isPremium ? 'プレミアム会員です' : 'Familink Premium'}
          </Text>
          <Text style={styles.heroSub}>
            {isPremium
              ? 'すべての機能をご利用いただけます'
              : '家族のための全機能を解放しましょう'
            }
          </Text>
        </Animated.View>

        {/* Active status */}
        {isPremium && (
          <Animated.View entering={FadeInDown.delay(100).springify().damping(18)} style={styles.activeCard}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            <Text style={styles.activeText}>プレミアムプランをご利用中</Text>
          </Animated.View>
        )}

        {/* Pricing */}
        {!isPremium && (
          <Animated.View entering={FadeInDown.delay(100).springify().damping(18)}>
            <View style={styles.pricingCard}>
              <View style={styles.priceRow}>
                <Text style={styles.price}>¥480</Text>
                <Text style={styles.pricePer}>/月</Text>
              </View>
              <Text style={styles.priceNote}>年払いは ¥4,800（2ヶ月分お得）</Text>
              {trialAvailable && (
                <View style={styles.trialBadge}>
                  <Text style={styles.trialBadgeText}>30日間無料でお試し</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Premium features */}
        <Animated.View entering={FadeInDown.delay(150).springify().damping(18)} style={styles.section}>
          <Text style={styles.sectionTitle}>プレミアム機能</Text>
          <View style={styles.featureList}>
            {PREMIUM_FEATURES.map((f, i) => (
              <Animated.View
                key={f.label}
                entering={FadeInDown.delay(160 + i * 30).springify().damping(18)}
                style={styles.featureRow}
              >
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureLabel}>{f.label}</Text>
                {isPremium && <Ionicons name="checkmark-circle" size={16} color={Colors.success} />}
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Free plan */}
        <Animated.View entering={FadeInDown.delay(200).springify().damping(18)} style={styles.section}>
          <Text style={styles.sectionTitle}>無料プランの制限</Text>
          <View style={styles.freeList}>
            {FREE_FEATURES.map(f => (
              <View key={f} style={styles.freeRow}>
                <Ionicons name="remove-circle-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.freeLabel}>{f}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* CTA */}
        {!isPremium && (
          <Animated.View entering={FadeInDown.delay(250).springify().damping(18)} style={styles.ctaSection}>
            {trialAvailable && (
              <Button
                title="30日間無料で試す"
                onPress={() => { startTrial(); activatePremium(); router.back(); }}
                variant="primary"
                size="lg"
                fullWidth
              />
            )}
            <Button
              title={trialAvailable ? '今すぐ購入（¥480/月）' : 'プレミアムを購入（¥480/月）'}
              onPress={() => { activatePremium(); router.back(); }}
              variant={trialAvailable ? 'outline' : 'primary'}
              size="lg"
              fullWidth
            />
            <Text style={styles.disclaimer}>
              ※ β版のため実際の決済は行われません。将来のアップデートで課金機能が追加されます。
              サブスクリプションはいつでもキャンセルできます。
            </Text>
          </Animated.View>
        )}
      </ScrollView>
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
  hero: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  heroEmoji: { fontSize: 64 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  heroSub: { fontSize: Typography.base, color: Colors.textSub, textAlign: 'center' },
  activeCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.successLight, borderRadius: Radius.xl,
    padding: Spacing.base, marginBottom: Spacing.xl,
  },
  activeText: { fontSize: Typography.base, color: Colors.success, fontWeight: '600' },
  pricingCard: {
    backgroundColor: Colors.primary, borderRadius: Radius.xxl,
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm,
    marginBottom: Spacing.xl, ...Shadows.xl,
  },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  price: { fontSize: 48, fontWeight: '800', color: '#fff' },
  pricePer: { fontSize: Typography.lg, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  priceNote: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.7)' },
  trialBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
  },
  trialBadgeText: { fontSize: Typography.sm, color: '#fff', fontWeight: '700' },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  featureList: { backgroundColor: Colors.card, borderRadius: Radius.xl, overflow: 'hidden', ...Shadows.sm },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight,
  },
  featureIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  featureLabel: { flex: 1, fontSize: Typography.base, color: Colors.text },
  freeList: { backgroundColor: Colors.card, borderRadius: Radius.xl, overflow: 'hidden', ...Shadows.sm },
  freeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight,
  },
  freeLabel: { fontSize: Typography.base, color: Colors.textSub },
  ctaSection: { gap: Spacing.sm, marginBottom: Spacing.xl },
  disclaimer: {
    fontSize: Typography.xs, color: Colors.textMuted,
    textAlign: 'center', lineHeight: Typography.xs * 1.6,
    marginTop: Spacing.sm,
  },
});
