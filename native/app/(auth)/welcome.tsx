import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withDelay, withTiming, FadeIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';

const { width } = Dimensions.get('window');

const FEATURES = [
  { icon: '📅', label: '予定共有', desc: '家族全員のスケジュールを一元管理' },
  { icon: '✅', label: 'タスク管理', desc: '家事・育児タスクをチームで分担' },
  { icon: '💰', label: '家計管理', desc: '収支を見える化して家計を改善' },
  { icon: '🌸', label: 'Hoku', desc: 'AI家族ガイドがサポート' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const titleY = useSharedValue(30);
  const titleO = useSharedValue(0);
  const cardY = useSharedValue(40);
  const cardO = useSharedValue(0);

  useEffect(() => {
    titleY.value = withDelay(100, withSpring(0, { damping: 18, stiffness: 200 }));
    titleO.value = withDelay(100, withTiming(1, { duration: 500 }));
    cardY.value = withDelay(300, withSpring(0, { damping: 18, stiffness: 200 }));
    cardO.value = withDelay(300, withTiming(1, { duration: 500 }));
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleY.value }],
    opacity: titleO.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardY.value }],
    opacity: cardO.value,
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <Animated.View style={[styles.hero, titleStyle]}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoEmoji}>🏠</Text>
        </View>
        <Text style={styles.brand}>Familink</Text>
        <Text style={styles.tagline}>家族みんなで子育てをチームに</Text>
      </Animated.View>

      <Animated.View style={[styles.features, cardStyle]}>
        {FEATURES.map((f, i) => (
          <Animated.View
            key={f.label}
            entering={FadeIn.delay(400 + i * 80).springify().damping(18)}
            style={styles.featureItem}
          >
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </Animated.View>
        ))}
      </Animated.View>

      <Animated.View style={[styles.actions, cardStyle]}>
        <Button
          title="はじめる"
          onPress={() => router.push('/(auth)/login?mode=signup')}
          variant="primary"
          size="lg"
          fullWidth
        />
        <Button
          title="ログイン"
          onPress={() => router.push('/(auth)/login?mode=login')}
          variant="outline"
          size="lg"
          fullWidth
        />
        <Text style={styles.terms}>
          続行することで、利用規約とプライバシーポリシーに同意したことになります
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: Radius.xxl,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  logoEmoji: { fontSize: 48 },
  brand: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: Typography.md,
    color: Colors.textSub,
    marginTop: Spacing.xs,
  },
  features: {
    gap: Spacing.base,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.base,
  },
  featureIcon: { fontSize: 28 },
  featureText: { flex: 1 },
  featureLabel: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
  },
  featureDesc: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actions: {
    gap: Spacing.sm,
  },
  terms: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: Typography.xs * 1.6,
    marginTop: Spacing.xs,
  },
});
