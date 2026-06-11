import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStore } from '@/store/useAuthStore';
import { ThemeProvider } from '@/theme/ThemeContext';

export default function RootLayout() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="login" options={{ presentation: 'modal' }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="event-edit" options={{ presentation: 'modal' }} />
            <Stack.Screen name="album" options={{ headerShown: true, title: 'アルバム' }} />
            <Stack.Screen name="shopping" options={{ headerShown: true, title: '買い物リスト' }} />
            <Stack.Screen name="budget" options={{ headerShown: true, title: '家計' }} />
            <Stack.Screen name="health" options={{ headerShown: true, title: '体調記録' }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
