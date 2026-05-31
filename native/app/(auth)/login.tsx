import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { useStore } from '../../src/store';
import { uid } from '../../src/utils/date';
import type { User } from '../../src/types';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode: 'login' | 'signup' }>();
  const [isSignup, setIsSignup] = useState(mode !== 'login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const login = useStore(s => s.login);
  const addMember = useStore(s => s.addMember);

  function validate() {
    const e: Record<string, string> = {};
    if (isSignup && !name.trim()) e.name = '名前を入力してください';
    if (!email.trim() || !email.includes('@')) e.email = '有効なメールアドレスを入力してください';
    if (password.length < 6) e.password = 'パスワードは6文字以上で入力してください';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const displayName = name.trim() || email.split('@')[0];
    const user: User = {
      id: 'u_' + uid(),
      displayName,
      name: displayName,
      email,
      role: 'parent',
      color: Colors.primary,
      createdAt: new Date().toISOString(),
    };
    login(user);
    if (isSignup) {
      addMember({
        id: 'm_' + user.id,
        userId: user.id,
        name: displayName,
        role: 'parent',
        color: Colors.primary,
        createdAt: new Date().toISOString(),
      });
    }
    router.replace('/(tabs)');
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ 戻る</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>{isSignup ? 'アカウント作成' : 'ログイン'}</Text>
          <Text style={styles.subtitle}>
            {isSignup
              ? 'Familinkで家族の時間を大切に'
              : 'おかえりなさい'}
          </Text>
        </View>

        <View style={styles.form}>
          {isSignup && (
            <Input
              label="お名前"
              placeholder="山田 太郎"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              error={errors.name}
            />
          )}
          <Input
            label="メールアドレス"
            placeholder="example@mail.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
          />
          <Input
            label="パスワード"
            placeholder="6文字以上"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            error={errors.password}
          />
          <Button
            title={isSignup ? 'アカウント作成' : 'ログイン'}
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
          />
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>または</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.switchBtn}
          onPress={() => setIsSignup(!isSignup)}
        >
          <Text style={styles.switchText}>
            {isSignup
              ? 'すでにアカウントをお持ちの方は '
              : 'アカウントをお持ちでない方は '}
            <Text style={styles.switchLink}>{isSignup ? 'ログイン' : '新規登録'}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
  },
  backBtn: {
    marginBottom: Spacing.base,
  },
  backText: {
    fontSize: Typography.md,
    color: Colors.primary,
    fontWeight: Typography.medium,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.base,
    color: Colors.textSub,
    marginTop: Spacing.xs,
  },
  form: {
    gap: Spacing.base,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    marginVertical: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  dividerText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  switchBtn: {
    alignItems: 'center',
  },
  switchText: {
    fontSize: Typography.base,
    color: Colors.textSub,
  },
  switchLink: {
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
});
