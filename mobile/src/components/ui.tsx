/**
 * Familink UI primitives.
 * ------------------------------------------------------------------
 * Small, theme-aware building blocks used across screens so every
 * surface keeps the Apple-native look (soft cards, 16px radius, system
 * type). Prefer these over raw View/Text.
 */
import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeContext';

/** Full-screen background container with safe-area handling. */
export function Screen({
  children,
  edges = ['top'],
  scroll = false,
  style,
}: {
  children: ReactNode;
  edges?: Edge[];
  scroll?: boolean;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[{ padding: 16, gap: 16 }, style]}
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, padding: 16, gap: 16 }, style]}>{children}</View>
  );
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
      {body}
    </SafeAreaView>
  );
}

type TextVariant =
  | 'largeTitle'
  | 'title'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption';

export function AppText({
  variant = 'body',
  color,
  muted,
  style,
  ...rest
}: TextProps & { variant?: TextVariant; color?: string; muted?: boolean }) {
  const { colors, typography } = useTheme();
  const base = typography[variant] as TextStyle;
  return (
    <Text
      style={[base, { color: color ?? (muted ? colors.textMuted : colors.text) }, style]}
      {...rest}
    />
  );
}

/** Rounded card surface. */
export function Card({ children, style, ...rest }: ViewProps & { children: ReactNode }) {
  const { colors, radius, shadow } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.bgCard,
          borderRadius: radius.md,
          padding: 16,
          ...shadow.sm,
        },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { colors, radius } = useTheme();
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.red
        : variant === 'secondary'
          ? colors.bgMuted
          : 'transparent';
  const fg =
    variant === 'primary' || variant === 'danger'
      ? '#fff'
      : variant === 'secondary'
        ? colors.text
        : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: radius.md,
          paddingVertical: 14,
          paddingHorizontal: 18,
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text style={{ color: fg, fontSize: 17, fontWeight: '600' }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Floating action button (bottom-right). */
export function FAB({
  onPress,
  icon = 'add',
  label = '追加',
}: {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
}) {
  const { colors, shadow } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.fab,
        shadow.lg,
        { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}>
      <Ionicons name={icon} size={28} color="#fff" />
    </Pressable>
  );
}

/** Section header row. */
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="title3">{title}</AppText>
      {action}
    </View>
  );
}

/** Empty-state with a friendly Hoku-style message. */
export function EmptyState({
  icon = 'sparkles-outline',
  message,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  message: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={44} color={colors.textMuted} />
      <AppText variant="callout" muted style={{ textAlign: 'center' }}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 48,
  },
});
