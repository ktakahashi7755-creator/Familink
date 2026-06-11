import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/theme/ThemeContext';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, radius } = useTheme();
  const { signInWithOtp, verifyOtp, continueLocal } = useAuthStore();

  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    if (!email.includes('@')) {
      setError('メールアドレスを確認してください');
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await signInWithOtp(email);
    setBusy(false);
    if (error) setError(error);
    else setStage('code');
  }

  async function verify() {
    setBusy(true);
    setError(null);
    const { error } = await verifyOtp(email, code);
    setBusy(false);
    if (error) setError(error);
    else router.back();
  }

  async function skip() {
    await continueLocal();
    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={colors.textSub} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="mail" size={48} color={colors.primary} />
        </View>

        {stage === 'email' ? (
          <>
            <AppText variant="title" style={{ textAlign: 'center' }}>
              ログイン
            </AppText>
            <AppText variant="callout" muted style={{ textAlign: 'center' }}>
              メールに届く確認コードでログインします。{'\n'}家族とデータを共有できます。
            </AppText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              style={[styles.input, { color: colors.text, backgroundColor: colors.bgCard, borderRadius: radius.md }]}
            />
            <Button title="確認コードを送る" onPress={sendCode} loading={busy} />
          </>
        ) : (
          <>
            <AppText variant="title" style={{ textAlign: 'center' }}>
              コードを入力
            </AppText>
            <AppText variant="callout" muted style={{ textAlign: 'center' }}>
              {email} に届いた6桁のコードを入力してください。
            </AppText>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.input, styles.codeInput, { color: colors.text, backgroundColor: colors.bgCard, borderRadius: radius.md }]}
            />
            <Button title="ログイン" onPress={verify} loading={busy} />
            <Pressable onPress={() => setStage('email')} hitSlop={8}>
              <AppText variant="footnote" color={colors.primary} style={{ textAlign: 'center' }}>
                メールアドレスを変更
              </AppText>
            </Pressable>
          </>
        )}

        {error && (
          <AppText variant="footnote" color={colors.red} style={{ textAlign: 'center' }}>
            {error}
          </AppText>
        )}

        <Pressable onPress={skip} hitSlop={8} style={{ marginTop: 8 }}>
          <AppText variant="footnote" muted style={{ textAlign: 'center' }}>
            あとで（この端末だけで使う）
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16 },
  body: { flex: 1, paddingHorizontal: 28, gap: 16, justifyContent: 'center', paddingBottom: 80 },
  iconWrap: { width: 96, height: 96, borderRadius: 48, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  input: { padding: 16, fontSize: 17 },
  codeInput: { fontSize: 28, letterSpacing: 8, textAlign: 'center', fontWeight: '700' },
});
