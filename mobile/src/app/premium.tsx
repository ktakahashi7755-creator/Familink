import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { useFamilyStore } from '@/store/useFamilyStore';
import { useTheme } from '@/theme/ThemeContext';

const FEATURES = [
  { icon: 'infinite' as const, title: '無制限の家族メンバー', body: '祖父母も含めて家族みんなで共有' },
  { icon: 'sparkles' as const, title: 'Hoku AI 使い放題', body: '予定・買い物・家計の段取りをAIが先回り' },
  { icon: 'images' as const, title: 'アルバム容量アップ', body: '思い出の写真をたっぷり保存' },
  { icon: 'notifications' as const, title: 'スマート通知', body: '予定・持ち物のリマインドを最適なタイミングで' },
  { icon: 'color-palette' as const, title: 'テーマ・Hoku着せ替え', body: '家族の気分に合わせてカスタマイズ' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const { colors, radius } = useTheme();
  const { premium, startTrial } = useFamilyStore();

  const trialActive = !!premium.trialStartedAt && !premium.premiumPaid;

  function begin() {
    haptic.success();
    startTrial();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.closeBar}>
        <Ionicons name="close" size={26} color={colors.textSub} onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={[styles.crown, { backgroundColor: colors.premiumBg }]}>
            <Ionicons name="star" size={44} color={colors.premium} />
          </View>
          <AppText variant="title" style={{ textAlign: 'center' }}>
            Familink プレミアム
          </AppText>
          <AppText variant="callout" muted style={{ textAlign: 'center' }}>
            家族の毎日を、もっとスムーズに。
          </AppText>
        </View>

        {/* β notice (§13.5) */}
        <View style={[styles.beta, { backgroundColor: colors.accentLight, borderRadius: radius.md }]}>
          <Ionicons name="information-circle" size={18} color={colors.accentDark} />
          <AppText variant="footnote" color={colors.accentDark} style={{ flex: 1 }}>
            現在はβ版です。実際の課金は行われません。30日間すべての機能をお試しいただけます。
          </AppText>
        </View>

        <View style={{ gap: 12 }}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.feature}>
              <View style={[styles.featIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={f.icon} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="headline">{f.title}</AppText>
                <AppText variant="footnote" muted>
                  {f.body}
                </AppText>
              </View>
            </View>
          ))}
        </View>

        {/* Price */}
        <View style={[styles.priceCard, { backgroundColor: colors.bgCard, borderRadius: radius.lg }]}>
          <AppText variant="footnote" muted>
            おすすめ
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
            <AppText variant="largeTitle">¥480</AppText>
            <AppText variant="body" muted style={{ marginBottom: 6 }}>
              / 月
            </AppText>
          </View>
          <AppText variant="footnote" muted>
            まずは30日間無料。いつでも解約できます。
          </AppText>
        </View>

        {premium.premiumPaid ? (
          <Button title="プレミアム利用中" variant="secondary" disabled />
        ) : trialActive ? (
          <Button title="トライアル中（30日間）" variant="secondary" disabled />
        ) : (
          <Button title="30日間 無料で始める" icon="star" onPress={begin} />
        )}

        <AppText variant="caption" muted style={{ textAlign: 'center' }}>
          無料プランでも基本機能はずっとお使いいただけます。
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  closeBar: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16 },
  crown: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  beta: { flexDirection: 'row', gap: 10, padding: 14, alignItems: 'flex-start' },
  feature: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  featIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  priceCard: { padding: 20, gap: 4, alignItems: 'flex-start' },
});
