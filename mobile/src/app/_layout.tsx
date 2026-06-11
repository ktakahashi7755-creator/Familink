import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';

import { ConfirmProvider } from '@/components/ConfirmProvider';
import { seedDemoData } from '@/lib/seed';
import { subscribeFamily } from '@/lib/sync';
import { useAuthStore } from '@/store/useAuthStore';
import { useFamilyStore } from '@/store/useFamilyStore';
import { usePrefsStore } from '@/store/usePrefsStore';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const init = useAuthStore((s) => s.init);
  const authReady = useAuthStore((s) => s.ready);
  const session = useAuthStore((s) => s.session);
  const familyId = useFamilyStore((s) => s.familyId);
  const familyHydrated = useFamilyStore((s) => s.hydrated);
  const prefsHydrated = usePrefsStore((s) => s.hydrated);

  useEffect(() => {
    init();
  }, [init]);

  // Real-time family sync: only when signed in AND a family scope is chosen.
  useEffect(() => {
    if (!session || !familyId) return;
    const unsubscribe = subscribeFamily(familyId);
    return unsubscribe;
  }, [session, familyId]);

  // Once all persisted state is restored, seed demo data on first run and reveal the app.
  const ready = authReady && familyHydrated && prefsHydrated;
  useEffect(() => {
    if (!ready) return;
    if (!usePrefsStore.getState().demoSeeded) {
      seedDemoData();
      usePrefsStore.getState().markDemoSeeded();
    }
    SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ConfirmProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="join" />
              <Stack.Screen name="login" options={{ presentation: 'modal' }} />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="event-edit" options={{ presentation: 'modal' }} />
              <Stack.Screen name="album" options={{ headerShown: true, title: 'アルバム' }} />
              <Stack.Screen name="shopping" options={{ headerShown: true, title: '買い物リスト' }} />
              <Stack.Screen name="budget" options={{ headerShown: true, title: '家計' }} />
              <Stack.Screen name="health" options={{ headerShown: true, title: '体調記録' }} />
              <Stack.Screen name="prep" options={{ headerShown: true, title: '持ち物・準備' }} />
              <Stack.Screen name="memo" options={{ headerShown: true, title: 'メモ' }} />
              <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
            </Stack>
          </ConfirmProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Friendly fallback when a route throws (expo-router ErrorBoundary). */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorView message={error.message} retry={retry} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ErrorView({ message, retry }: { message: string; retry: () => Promise<void> }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
      <Ionicons name="sad-outline" size={56} color={colors.textMuted} />
      <AppText variant="title3" style={{ textAlign: 'center' }}>
        ごめんなさい、問題が発生しました
      </AppText>
      <AppText variant="footnote" muted style={{ textAlign: 'center' }}>
        {message}
      </AppText>
      <Button title="もう一度試す" onPress={() => retry()} />
    </View>
  );
}
