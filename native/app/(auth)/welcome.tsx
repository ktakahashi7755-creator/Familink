import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, interpolate, Extrapolation,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { haptic } from '../../src/utils/haptics';

const { width } = Dimensions.get('window');

const PAGES = [
  {
    id: 'welcome',
    icon: '🏠',
    accentColor: '#5B7FFF',
    title: 'Familinkへようこそ',
    subtitle: '家族みんなで子育てをチームに',
    description: '忙しいパパ・ママのための\n家族管理アプリです',
    features: [
      { icon: '📅', text: '予定を家族で共有' },
      { icon: '✅', text: 'タスクを分担管理' },
      { icon: '🛒', text: '買い物リストを共有' },
    ],
  },
  {
    id: 'organize',
    icon: '📊',
    accentColor: '#4CC9A0',
    title: '家族の情報を一元管理',
    subtitle: '大切なことを見逃しません',
    description: 'カレンダー・タスク・メモ・家計・\n体調記録をひとつで管理',
    features: [
      { icon: '💰', text: '家計を見える化' },
      { icon: '❤️', text: '体調を記録' },
      { icon: '📝', text: 'メモ・書類を保存' },
    ],
  },
  {
    id: 'hoku',
    icon: '🌸',
    accentColor: Colors.primary,
    title: 'HokuがAIサポート',
    subtitle: '家族AIガイドが毎日をサポート',
    description: '予定案内・タスク管理・Hokuへの相談、\nいつでも家族をサポートします',
    features: [
      { icon: '🌸', text: 'Hokuに何でも相談' },
      { icon: '🔔', text: '大切な予定を通知' },
      { icon: '⭐', text: 'プレミアムで全解放' },
    ],
  },
];

function PageDot({ index, current, total }: { index: number; current: number; total: number }) {
  const isActive = index === current;
  const style = useAnimatedStyle(() => ({
    width: withTiming(isActive ? 24 : 8, { duration: 200 }),
    opacity: withTiming(isActive ? 1 : 0.35, { duration: 200 }),
  }));
  return (
    <Animated.View
      style={[
        {
          height: 8, borderRadius: 4,
          backgroundColor: PAGES[current].accentColor,
        },
        style,
      ]}
    />
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollX = useSharedValue(0);

  const isLast = currentPage === PAGES.length - 1;
  const page = PAGES[currentPage];

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.value = e.nativeEvent.contentOffset.x;
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== currentPage && idx >= 0 && idx < PAGES.length) {
      haptic.selection();
      setCurrentPage(idx);
    }
  }, [currentPage, scrollX]);

  const goNext = useCallback(() => {
    if (isLast) {
      haptic.medium();
      router.push('/(auth)/login?mode=signup');
    } else {
      haptic.light();
      const next = currentPage + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setCurrentPage(next);
    }
  }, [isLast, currentPage, router]);

  const goLogin = useCallback(() => {
    haptic.light();
    router.push('/(auth)/login?mode=login');
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity style={styles.skip} onPress={goLogin}>
          <Text style={styles.skipText}>スキップ</Text>
        </TouchableOpacity>
      )}

      {/* Page slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.pager}
        decelerationRate="fast"
        bounces={false}
      >
        {PAGES.map((p) => (
          <View key={p.id} style={[styles.slide, { width }]}>
            {/* Hero */}
            <View style={[styles.heroWrap, { backgroundColor: p.accentColor + '12' }]}>
              <View style={[styles.iconCircle, { backgroundColor: p.accentColor + '20' }]}>
                <Text style={styles.iconText}>{p.icon}</Text>
              </View>
              <Text style={styles.heroTitle}>{p.title}</Text>
              <Text style={[styles.heroSubtitle, { color: p.accentColor }]}>{p.subtitle}</Text>
              <Text style={styles.heroDesc}>{p.description}</Text>
            </View>

            {/* Feature list */}
            <View style={styles.featureList}>
              {p.features.map((f, i) => (
                <Animated.View
                  key={i}
                  style={[styles.featureRow, { borderLeftColor: p.accentColor }]}
                >
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                  <Text style={styles.featureText}>{f.text}</Text>
                </Animated.View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
        {/* Page dots */}
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <PageDot key={i} index={i} current={currentPage} total={PAGES.length} />
          ))}
        </View>

        {/* CTA */}
        <Button
          title={isLast ? 'はじめる' : '次へ'}
          onPress={goNext}
          variant="primary"
          size="lg"
          fullWidth
        />

        <TouchableOpacity onPress={goLogin} style={styles.loginBtn}>
          <Text style={styles.loginText}>
            {isLast ? 'ログインはこちら' : 'すでにアカウントをお持ちの方'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.terms}>
          続行することで、利用規約とプライバシーポリシーに同意したことになります
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  skip: {
    position: 'absolute', top: 0, right: Spacing.xl, zIndex: 10, padding: Spacing.base,
  },
  skipText: { fontSize: Typography.sm, color: Colors.textMuted },
  pager: { flex: 1 },
  slide: { flex: 1 },
  heroWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl, gap: Spacing.sm,
  },
  iconCircle: {
    width: 110, height: 110, borderRadius: 55,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  iconText: { fontSize: 52 },
  heroTitle: { fontSize: Typography.xxl, fontWeight: '800', color: Colors.text, textAlign: 'center', letterSpacing: -0.5 },
  heroSubtitle: { fontSize: Typography.md, fontWeight: '600', textAlign: 'center' },
  heroDesc: {
    fontSize: Typography.base, color: Colors.textSub, textAlign: 'center',
    lineHeight: Typography.base * 1.6, marginTop: 4,
  },
  featureList: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.card, borderRadius: Radius.xl,
    padding: Spacing.base,
    borderLeftWidth: 3,
    ...Shadows.sm,
  },
  featureIcon: { fontSize: 22 },
  featureText: { fontSize: Typography.base, color: Colors.text, fontWeight: '500' },
  bottom: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderLight,
  },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, marginBottom: 4 },
  loginBtn: { alignItems: 'center', paddingVertical: 4 },
  loginText: { fontSize: Typography.sm, color: Colors.primary, fontWeight: '600' },
  terms: {
    fontSize: Typography.xs, color: Colors.textMuted,
    textAlign: 'center', lineHeight: Typography.xs * 1.6,
  },
});
