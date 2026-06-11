import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Segmented } from '@/components/Segmented';
import { AppText, Button, Card } from '@/components/ui';
import { useConfirm } from '@/components/ConfirmProvider';
import { clearAllReminders, requestNotificationPermission, syncEventReminders } from '@/lib/notifications';
import { fullSync } from '@/lib/sync';
import { memberColors } from '@/theme/tokens';
import { useAuthStore } from '@/store/useAuthStore';
import { useFamilyStore } from '@/store/useFamilyStore';
import { usePrefsStore, type ThemeMode } from '@/store/usePrefsStore';
import { useTheme } from '@/theme/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  const confirm = useConfirm();
  const { colors, radius } = useTheme();
  const { session, mode, signOut } = useAuthStore();
  const { profile, setProfile, members, addMember, removeMember, premium, events, familyId, setFamilyId } =
    useFamilyStore();
  const { themeMode, setThemeMode, remindersEnabled, setRemindersEnabled } = usePrefsStore();

  const [newMember, setNewMember] = useState('');
  const [joinId, setJoinId] = useState(familyId ?? '');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function runSync() {
    setSyncing(true);
    setSyncMsg(null);
    if (joinId.trim() && joinId.trim() !== familyId) setFamilyId(joinId.trim());
    const r = await fullSync();
    setSyncing(false);
    setSyncMsg(r.ok ? `同期しました（送信 ${r.pushed} / 受信 ${r.pulled}）` : `同期できませんでした: ${r.error ?? '不明なエラー'}`);
  }

  async function shareInvite() {
    const id = (joinId.trim() || familyId || session?.user.id) ?? '';
    if (!id) return;
    if (!familyId) setFamilyId(id);
    const url = Linking.createURL('join', { queryParams: { family: id } });
    try {
      await Share.share({ message: `Familinkで家族の予定を共有しよう！このリンクから参加してね:\n${url}` });
    } catch {
      // cancelled
    }
  }

  async function toggleReminders(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      setRemindersEnabled(true);
      await syncEventReminders(events);
    } else {
      setRemindersEnabled(false);
      await clearAllReminders();
    }
  }

  async function clearDemo() {
    const ok = await confirm({
      title: 'デモデータを消去',
      message: 'サンプルの家族・予定・買い物などをすべて削除します。この操作は取り消せません。',
      destructive: true,
      confirmLabel: '消去する',
    });
    if (ok) {
      useFamilyStore.setState({
        members: [], events: [], tasks: [], txs: [], posts: [], health: [],
        shoppingItems: [], prep: [], memos: [],
      });
    }
  }

  function handleAddMember() {
    if (!newMember.trim()) return;
    const color = memberColors[members.length % memberColors.length];
    addMember({ name: newMember.trim(), color });
    setNewMember('');
  }

  const trialActive = !!premium.trialStartedAt && !premium.premiumPaid;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <AppText variant="largeTitle">設定</AppText>

        {/* Account */}
        <Card>
          <AppText variant="footnote" muted style={{ marginBottom: 8 }}>
            アカウント
          </AppText>
          <TextInput
            value={profile.name}
            onChangeText={(name) => setProfile({ name })}
            placeholder="お名前"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.bgInset, borderRadius: radius.sm }]}
          />
          <View style={styles.accountRow}>
            <Ionicons
              name={session ? 'cloud-done' : 'phone-portrait-outline'}
              size={18}
              color={session ? colors.secondary : colors.textMuted}
            />
            <AppText variant="footnote" muted>
              {session ? `クラウド同期中 (${session.user.email})` : 'この端末に保存中（ログインで家族共有）'}
            </AppText>
          </View>
          {mode === 'local' && (
            <Button title="ログインして家族と共有" variant="secondary" icon="log-in" onPress={() => router.push('/login')} style={{ marginTop: 10 }} />
          )}
        </Card>

        {/* Family sharing (β) — only when signed in */}
        {session && (
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="people" size={16} color={colors.primary} />
              <AppText variant="footnote" muted>
                家族と共有（β）
              </AppText>
            </View>
            <AppText variant="caption" muted>
              家族IDを共有すると、同じデータを家族の端末と同期できます。空欄なら自分のIDが使われます。
            </AppText>
            <TextInput
              value={joinId}
              onChangeText={setJoinId}
              placeholder="家族ID（任意）"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              style={[styles.input, { color: colors.text, backgroundColor: colors.bgInset, borderRadius: radius.sm }]}
            />
            <Button title="今すぐ同期" icon="sync" variant="secondary" loading={syncing} onPress={runSync} />
            <Button title="家族を招待" icon="share-social" variant="ghost" onPress={shareInvite} />
            {syncMsg && (
              <AppText variant="caption" muted style={{ textAlign: 'center' }}>
                {syncMsg}
              </AppText>
            )}
          </Card>
        )}

        {/* Premium */}
        <Pressable onPress={() => router.push('/premium')}>
          <Card style={{ backgroundColor: premium.premiumPaid ? colors.bgCard : colors.premiumBg }}>
            <View style={styles.premiumHeader}>
              <Ionicons name="star" size={20} color={colors.premium} />
              <AppText variant="headline">Familink プレミアム</AppText>
            </View>
            <AppText variant="footnote" muted style={{ marginTop: 4 }}>
              {premium.premiumPaid
                ? 'プレミアム会員 — ありがとうございます'
                : trialActive
                  ? '無料トライアル中（30日間すべての機能が使えます）'
                  : '月額480円。タップで30日間の無料トライアルを開始'}
            </AppText>
          </Card>
        </Pressable>

        {/* Members */}
        <Card>
          <AppText variant="footnote" muted style={{ marginBottom: 8 }}>
            家族メンバー
          </AppText>
          {members.map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <View style={[styles.dot, { backgroundColor: m.color }]} />
              <AppText variant="body" style={{ flex: 1 }}>
                {m.name}
              </AppText>
              <Pressable onPress={() => removeMember(m.id)} hitSlop={8}>
                <Ionicons name="remove-circle-outline" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
          <View style={[styles.addRow, { backgroundColor: colors.bgInset, borderRadius: radius.sm }]}>
            <TextInput
              value={newMember}
              onChangeText={setNewMember}
              placeholder="メンバーを追加"
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, color: colors.text, fontSize: 16 }}
              onSubmitEditing={handleAddMember}
            />
            <Pressable onPress={handleAddMember} hitSlop={8}>
              <Ionicons name="add-circle" size={26} color={colors.primary} />
            </Pressable>
          </View>
        </Card>

        {/* Appearance & notifications */}
        <Card style={{ gap: 14 }}>
          <View>
            <AppText variant="footnote" muted style={{ marginBottom: 8 }}>
              テーマ
            </AppText>
            <Segmented<ThemeMode>
              options={[
                { key: 'system', label: '自動' },
                { key: 'light', label: 'ライト' },
                { key: 'dark', label: 'ダーク' },
              ]}
              value={themeMode}
              onChange={setThemeMode}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="body">予定のリマインド</AppText>
              <AppText variant="caption" muted>
                時刻のある予定の30分前にお知らせ
              </AppText>
            </View>
            <Switch value={remindersEnabled} onValueChange={toggleReminders} />
          </View>
        </Card>

        {/* Links */}
        <Card style={{ paddingVertical: 4 }}>
          <LinkRow icon="images-outline" label="アルバム" onPress={() => router.push('/album')} />
          <LinkRow icon="cart-outline" label="買い物リスト" onPress={() => router.push('/shopping')} />
          <LinkRow icon="wallet-outline" label="家計" onPress={() => router.push('/budget')} />
          <LinkRow icon="bag-handle-outline" label="持ち物・準備" onPress={() => router.push('/prep')} />
          <LinkRow icon="document-text-outline" label="メモ" onPress={() => router.push('/memo')} />
          <LinkRow icon="thermometer-outline" label="体調記録" onPress={() => router.push('/health')} last />
        </Card>

        {/* Data management */}
        <Card style={{ paddingVertical: 4 }}>
          <LinkRow icon="trash-outline" label="デモデータを消去" onPress={clearDemo} last />
        </Card>

        {session && <Button title="ログアウト" variant="ghost" onPress={signOut} />}

        <AppText variant="caption" muted style={{ textAlign: 'center' }}>
          Familink — 家族みんなで子育てをチームに
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.linkRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight }]}>
      <Ionicons name={icon} size={20} color={colors.textSub} />
      <AppText variant="body" style={{ flex: 1 }}>
        {label}
      </AppText>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  input: { padding: 12, fontSize: 16 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  premiumHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginTop: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4 },
});
