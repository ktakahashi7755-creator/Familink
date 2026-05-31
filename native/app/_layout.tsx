import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '../src/store';
import { Colors } from '../src/constants/theme';
import { requestPermission } from '../src/services/notifications';

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const loggedIn = useStore(s => s.loggedIn);
  const onboardCompleted = useStore(s => s.onboardCompleted);

  useEffect(() => {
    const inAuth = segments[0] === '(auth)';
    if (!loggedIn && !inAuth) {
      router.replace('/(auth)/welcome');
    } else if (loggedIn && inAuth) {
      router.replace('/(tabs)');
    }
  }, [loggedIn, segments]);

  return null;
}

function NotificationSetup() {
  const loggedIn = useStore(s => s.loggedIn);
  useEffect(() => {
    if (loggedIn) {
      requestPermission();
    }
  }, [loggedIn]);
  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AuthGate />
        <NotificationSetup />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="modals/event-edit"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="modals/task-edit"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="modals/memo-edit"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen name="hoku" />
          <Stack.Screen name="budget" />
          <Stack.Screen name="health" />
          <Stack.Screen name="shopping" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="premium" />
          <Stack.Screen name="members" />
          <Stack.Screen name="board" />
          <Stack.Screen name="album" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
