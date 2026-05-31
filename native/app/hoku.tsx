import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useStore, useEvents, useTasks, useShopping } from '../src/store';
import { Colors, Typography, Spacing, Radius, Shadows } from '../src/constants/theme';
import { todayStr } from '../src/utils/date';

type Message = { id: string; role: 'hoku' | 'user'; text: string; time: string };

const SUGGESTIONS = [
  '今日の予定を教えて',
  '未完了のタスクは？',
  '買い物リストを確認して',
  '今週どんなことがある？',
];

function buildContext(events: any[], tasks: any[], shopping: any[]) {
  const today = todayStr();
  const todayEvt = events.filter(e => e.date === today || e.startDate === today);
  const pending = tasks.filter(t => !t.done).slice(0, 5);
  const pendingShopping = shopping.filter(s => !s.done).slice(0, 5);
  const parts: string[] = [];
  if (todayEvt.length > 0) {
    parts.push(`今日の予定: ${todayEvt.map(e => e.title + (e.time ? ` (${e.time})` : '')).join('、')}`);
  }
  if (pending.length > 0) {
    parts.push(`未完了タスク: ${pending.map(t => t.title).join('、')}`);
  }
  if (pendingShopping.length > 0) {
    parts.push(`買い物: ${pendingShopping.map(s => s.name).join('、')}`);
  }
  return parts.join('\n');
}

function generateHokuResponse(input: string, context: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('予定') || lower.includes('スケジュール')) {
    const evtLine = context.split('\n').find(l => l.startsWith('今日の予定'));
    return evtLine
      ? `${evtLine.replace('今日の予定: ', '今日は ')}があります。準備は大丈夫ですか？`
      : '今日は特に予定が入っていません。ゆっくり過ごせそうですね 🌸';
  }
  if (lower.includes('タスク')) {
    const taskLine = context.split('\n').find(l => l.startsWith('未完了タスク'));
    return taskLine
      ? `${taskLine.replace('未完了タスク: ', '')}が残っています。一つずつ片付けていきましょう ✅`
      : '未完了のタスクはありません。お疲れさまでした！';
  }
  if (lower.includes('買い物')) {
    const shopLine = context.split('\n').find(l => l.startsWith('買い物'));
    return shopLine
      ? `買い物リストに${shopLine.replace('買い物: ', '')}があります。お買い物のついでに確認してみてください 🛒`
      : '買い物リストは空です。今日は何か必要なものはありますか？';
  }
  return 'ご家族のために、できることがあれば何でも聞いてくださいね 🌸 今日も素敵な一日を！';
}

export default function HokuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const events = useEvents();
  const tasks = useTasks();
  const shopping = useShopping();
  const user = useStore(s => s.user);
  const scrollRef = useRef<ScrollView>(null);

  const context = buildContext(events, tasks, shopping);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'hoku',
      text: `こんにちは、${user?.displayName ?? user?.name ?? 'パパ・ママ'}さん 🌸\n何でも気軽に話しかけてくださいね。今日もご家族を全力でサポートします！`,
      time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');

  function sendMessage(text: string) {
    if (!text.trim()) return;
    const now = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: text.trim(), time: now };
    const hokuMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'hoku',
      text: generateHokuResponse(text, context),
      time: now,
    };
    setMessages(prev => [...prev, userMsg, hokuMsg]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.hokuEmoji}>🌸</Text>
          <View>
            <Text style={styles.headerTitle}>Hoku</Text>
            <Text style={styles.headerSub}>家族AIガイド</Text>
          </View>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.messages, { paddingBottom: 20 }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map((msg, i) => (
            <Animated.View
              key={msg.id}
              entering={FadeInDown.delay(i === 0 ? 0 : 50).springify().damping(18)}
              style={[
                styles.bubble,
                msg.role === 'user' ? styles.userBubble : styles.hokububble,
              ]}
            >
              {msg.role === 'hoku' && <Text style={styles.hokuBubbleEmoji}>🌸</Text>}
              <View style={[
                styles.bubbleContent,
                msg.role === 'user' ? styles.userBubbleContent : styles.hokuBubbleContent,
              ]}>
                <Text style={[styles.bubbleText, msg.role === 'user' && styles.userBubbleText]}>
                  {msg.text}
                </Text>
                <Text style={[styles.bubbleTime, msg.role === 'user' && styles.userBubbleTime]}>
                  {msg.time}
                </Text>
              </View>
            </Animated.View>
          ))}
        </ScrollView>

        {/* Suggestions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestions}
        >
          {SUGGESTIONS.map(s => (
            <TouchableOpacity key={s} style={styles.suggestion} onPress={() => sendMessage(s)}>
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.textInput}
            placeholder="Hokuに話しかける..."
            placeholderTextColor={Colors.textPlaceholder}
            value={input}
            onChangeText={setInput}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim()}
          >
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  hokuEmoji: { fontSize: 32 },
  headerTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: Typography.xs, color: Colors.textMuted },
  messages: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, gap: Spacing.sm },
  bubble: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  userBubble: { flexDirection: 'row-reverse' },
  hokububble: {},
  hokuBubbleEmoji: { fontSize: 24, marginBottom: 4 },
  bubbleContent: {
    maxWidth: '75%', padding: Spacing.sm,
    borderRadius: Radius.xl,
  },
  hokuBubbleContent: {
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 4,
    ...Shadows.sm,
  },
  userBubbleContent: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: Typography.base, color: Colors.text, lineHeight: Typography.base * 1.5 },
  userBubbleText: { color: '#fff' },
  bubbleTime: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  userBubbleTime: { color: 'rgba(255,255,255,0.7)' },
  suggestions: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  suggestion: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  suggestionText: { fontSize: Typography.sm, color: Colors.primary },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderLight,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 22,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    fontSize: Typography.base,
    color: Colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
});
