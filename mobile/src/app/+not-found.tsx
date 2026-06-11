import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

export default function NotFound() {
  const { colors } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'ページが見つかりません' }} />
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
        <Ionicons name="compass-outline" size={56} color={colors.textMuted} />
        <AppText variant="title3" style={{ textAlign: 'center' }}>
          ページが見つかりませんでした
        </AppText>
        <Button title="ホームへ戻る" onPress={() => router.replace('/(tabs)')} />
      </View>
    </>
  );
}
