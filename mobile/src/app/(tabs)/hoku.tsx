import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { HokuAvatar } from '@/features/hoku/HokuAvatar';
import { askHoku, type HokuEntities, type HokuReply } from '@/features/hoku/hokuClient';
import { haptic } from '@/lib/haptics';
import { todayISO } from '@/lib/utils';
import { useFamilyStore } from '@/store/useFamilyStore';
import { useTheme } from '@/theme/ThemeContext';
import type { HokuMessage } from '@/types';

export default function HokuScreen() {
  const { colors, radius } = useTheme();
  const store = useFamilyStore();
  const { hokuMessages, pushHokuMessage } = store;
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Suggestions adapt to the family's current data.
  const suggestions = useMemo(() => {
    const s: string[] = ['今日の予定を教えて'];
    if (store.shoppingItems.some((i) => !i.done)) s.push('買うもの見せて');
    else s.push('牛乳を買い物に追加して');
    s.push(store.tasks.some((t) => !t.done) ? 'やること見せて' : '明日 10時に病院を予定に入れて');
    return s;
  }, [store.shoppingItems, store.tasks]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput('');
    pushHokuMessage({ role: 'user', text: trimmed });
    setBusy(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    const context = {
      today: todayISO(),
      members: store.members.map((m) => m.name),
      events: store.events.map((e) => ({ date: e.date, title: e.title, start: e.start })),
      tasks: store.tasks.map((t) => ({ title: t.title, done: t.done })),
      shopping: store.shoppingItems.map((s) => ({ name: s.name, done: s.done })),
    };

    const reply = await askHoku(trimmed, context, hokuMessages);
    const action = buildAction(reply);
    pushHokuMessage({ role: 'assistant', text: reply.reply, action });
    setBusy(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  }

  function buildAction(reply: HokuReply): HokuMessage['action'] | undefined {
    const addable: Record<string, NonNullable<HokuMessage['action']>['type'] | undefined> = {
      calendar_add: 'add_event',
      task_add: 'add_task',
      shopping_add: 'add_shopping',
      budget_add: 'add_transaction',
      health_add: 'add_health',
      board_post_add: 'add_post',
      prep_add: 'add_prep',
    };
    const type = addable[reply.intent];
    if (!type) return undefined;
    return { type, payload: reply.entities as Record<string, unknown>, confirmed: false };
  }

  function confirmAction(msg: HokuMessage) {
    const a = msg.action;
    if (!a) return;
    const e = a.payload as HokuEntities;
    switch (a.type) {
      case 'add_event':
        store.addEvent({ title: e.title ?? '新しい予定', date: e.date ?? todayISO(), start: e.time, allDay: !e.time });
        break;
      case 'add_task':
        store.addTask({ title: e.title ?? '新しいタスク' });
        break;
      case 'add_shopping':
        store.addShopping(e.title ?? '買うもの');
        break;
      case 'add_transaction':
        store.addTx({ type: e.txType ?? 'expense', amount: e.amount ?? 0, category: e.category, date: e.date ?? todayISO() });
        break;
      case 'add_health':
        store.addHealth({ date: e.date ?? todayISO(), temperature: e.temperature ? parseFloat(e.temperature) : undefined, symptom: e.symptoms?.join('・') });
        break;
      case 'add_post':
        store.addPost({ text: e.title ?? '' });
        break;
      case 'add_prep':
        store.addPrep({ name: e.title ?? '持ち物' });
        break;
    }
    haptic.success();
    pushHokuMessage({ role: 'assistant', text: 'OK、入れておいたよ。' });
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <View style={styles.header}>
          <HokuAvatar size={40} />
          <View>
            <AppText variant="headline">Hoku</AppText>
            <AppText variant="caption" muted>
              家族の段取りをそっとお手伝い
            </AppText>
          </View>
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, gap: 12 }}>
          {hokuMessages.length === 0 && (
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 32 }}>
              <HokuAvatar size={84} />
              <AppText variant="title3">こんにちは、Hokuだよ</AppText>
              <AppText variant="callout" muted style={{ textAlign: 'center' }}>
                予定や買い物、やることを{'\n'}気軽に話しかけてね。
              </AppText>
            </View>
          )}

          {hokuMessages.map((m) => (
            <View key={m.id} style={{ alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: m.role === 'user' ? colors.primary : colors.bgCard,
                    borderRadius: radius.lg,
                  },
                ]}>
                <AppText variant="body" color={m.role === 'user' ? '#fff' : colors.text}>
                  {m.text}
                </AppText>
              </View>
              {m.role === 'assistant' && m.action && !m.action.confirmed && (
                <Pressable
                  onPress={() => confirmAction(m)}
                  style={[styles.actionBtn, { backgroundColor: colors.secondaryLight, borderRadius: radius.full }]}>
                  <Ionicons name="add-circle" size={16} color={colors.secondaryDark} />
                  <AppText variant="footnote" color={colors.secondaryDark}>
                    追加する
                  </AppText>
                </Pressable>
              )}
            </View>
          ))}

          {busy && (
            <View style={[styles.bubble, { backgroundColor: colors.bgCard, borderRadius: radius.lg }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
        </ScrollView>

        {hokuMessages.length === 0 && (
          <View style={styles.suggestRow}>
            {suggestions.map((s) => (
              <Pressable
                key={s}
                onPress={() => send(s)}
                style={[styles.suggestChip, { backgroundColor: colors.bgCard, borderRadius: radius.full }]}>
                <AppText variant="footnote" color={colors.primary}>
                  {s}
                </AppText>
              </Pressable>
            ))}
          </View>
        )}

        <View style={[styles.inputBar, { backgroundColor: colors.bgCard }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Hokuに話しかける"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.bgInset, borderRadius: radius.full }]}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <Pressable onPress={() => send(input)} disabled={!input.trim() || busy} hitSlop={8}>
            <Ionicons name="arrow-up-circle" size={36} color={input.trim() ? colors.primary : colors.textMuted} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, marginTop: 6 },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  suggestChip: { paddingHorizontal: 14, paddingVertical: 8 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, maxHeight: 100 },
});
