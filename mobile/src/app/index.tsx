import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/theme/ThemeContext';

/** Entry gate: routes to onboarding or the main tabs once auth state is ready. */
export default function Index() {
  const { ready, onboarded } = useAuthStore();
  const { colors } = useTheme();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!onboarded) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
