import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { fullSync } from '@/lib/sync';
import { useAuthStore } from '@/store/useAuthStore';
import { useFamilyStore } from '@/store/useFamilyStore';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Deep-link target for family invites: familink://join?family=<id>
 * Sets the family scope, then pulls the shared data.
 */
export default function JoinScreen() {
  const { colors } = useTheme();
  const { family } = useLocalSearchParams<{ family?: string }>();
  const session = useAuthStore((s) => s.session);
  const setFamilyId = useFamilyStore((s) => s.setFamilyId);
  const [status, setStatus] = useState<'working' | 'done' | 'need-login' | 'error'>('working');

  useEffect(() => {
    (async () => {
      if (!family) {
        setStatus('error');
        return;
      }
      if (!session) {
        setStatus('need-login');
        return;
      }
      setFamilyId(family);
      const r = await fullSync();
      setStatus(r.ok ? 'done' : 'error');
    })();
  }, [family, session, setFamilyId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
      {status === 'working' && <ActivityIndicator color={colors.primary} />}
      <AppText variant="title3" style={{ textAlign: 'center' }}>
        {status === 'working' && '家族に参加しています…'}
        {status === 'done' && '家族に参加しました！'}
        {status === 'need-login' && 'ログインが必要です'}
        {status === 'error' && 'リンクが正しくないようです'}
      </AppText>
      {status === 'need-login' && (
        <Button title="ログインする" onPress={() => router.replace('/login')} />
      )}
      {status !== 'working' && status !== 'need-login' && (
        <Button title="ホームへ" onPress={() => router.replace('/(tabs)')} />
      )}
    </View>
  );
}
