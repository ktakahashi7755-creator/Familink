import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../src/store';
import { Colors, Typography, Spacing, Radius } from '../src/constants/theme';
import { Button } from '../src/components/ui/Button';
import { EmptyState } from '../src/components/ui/EmptyState';
import { haptic } from '../src/utils/haptics';

export default function AlbumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isPremium = useStore(s => s.isPremiumUser);

  if (!isPremium) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
        <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', top: insets.top + 16, left: Spacing.base }}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 48, marginBottom: Spacing.base }}>🖼️</Text>
        <Text style={{ fontSize: Typography.xl, fontWeight: '700', color: Colors.text, textAlign: 'center' }}>アルバム</Text>
        <Text style={{ fontSize: Typography.base, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl }}>
          プレミアムプランで家族の大切な写真を保存・整理できます
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
        <Text style={styles.headerTitle}>アルバム</Text>
        <TouchableOpacity onPress={() => haptic.light()}>
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      <EmptyState
        icon="🖼️"
        title="写真なし"
        description="家族の大切な写真をここに保存できます"
        actionLabel="写真を追加"
        onAction={() => haptic.light()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm,
  },
  headerTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text },
});
