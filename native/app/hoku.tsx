import React, { useState, useRef, useCallback } from 'react';
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
import { TypingIndicator } from '../src/components/ui/TypingIndicator';
import { haptic } from '../src/utils/haptics';
import { todayStr } from '../src/utils/date';

type Message = { id: string; role: 'hoku' | 'user'; text: string; time: string };

const SUGGESTIONS = [
  '今日の予定を教えて',
  '未完了のタスクは？',
  '買い物リストを確認して',
  '使い方を教えて',
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
  const hour = new Date().getHours();

  if (lower.match(/おはよ|こんにちは|こんばんは|やあ|ハロー|hello|hi/)) {
    const greet = hour < 12 ? 'おはようございます' : hour < 17 ? 'こんにちは' : 'こんばんは';
    return `${greet}！🌸 今日もご家族のサポートをお任せください。何かお手伝いできることはありますか？`;
  }

  if (lower.match(/予定|スケジュール|今日|明日|今週|何がある/)) {
    const evtLine = context.split('\n').find(l => l.startsWith('今日の予定'));
    if (evtLine) {
      const evts = evtLine.replace('今日の予定: ', '');
      return `今日は ${evts} の予定があります 📅\n余裕を持って準備できそうですか？`;
    }
    return '今日は特に予定が入っていないようです。ゆっくり過ごせそうですね 🌸\n新しい予定はカレンダータブから追加できますよ！';
  }

  if (lower.match(/タスク|やること|家事|to.?do/)) {
    const taskLine = context.split('\n').find(l => l.startsWith('未完了タスク'));
    if (taskLine) {
      const tasks = taskLine.replace('未完了タスク: ', '');
      return `現在 ${tasks} が残っています ✅\n一つずつ片付けていきましょう！`;
    }
    return '未完了のタスクはありません 🎉\nすべて片付いているんですね、素晴らしいです！';
  }

  if (lower.match(/買い物|買う|スーパー|コンビニ|購入|ショッピング/)) {
    const shopLine = context.split('\n').find(l => l.startsWith('買い物'));
    if (shopLine) {
      return `買い物リストに ${shopLine.replace('買い物: ', '')} が入っています 🛒\nお出かけの際にチェックしてみてください！`;
    }
    return '買い物リストは空です。必要なものがあれば追加しておくと便利ですよ 🛒';
  }

  if (lower.match(/体調|健康|熱|薬|病院|子ど|さむい|しんど/)) {
    return 'お子さんの体調が心配なときは、体調記録タブで記録しておきましょう 🏥\n急な場合は医療機関や #7119 にご相談ください。';
  }

  if (lower.match(/お金|家計|予算|支出|収入|節約/)) {
    return '家計管理は「その他」タブから確認できます 💰\n毎日少しずつ記録するとグラフで見える化できますよ！';
  }

  if (lower.match(/使い方|ヘルプ|操作|方法|機能/)) {
    return 'Familinkの主な機能です：\n\n📅 カレンダー — 家族の予定を管理\n✅ タスク — 家事・育児を分担\n📝 メモ — 大切なことを保存\n💰 家計管理 — 収支を記録\n🌸 Hoku — いつでもご相談を！\n\n何か詳しく知りたいことはありますか？';
  }

  if (lower.match(/hoku|ほく|あなた|なに|だれ|誰/)) {
    return 'わたしはHokuです 🌸\nご家族の日々をサポートする家族AIガイドです。予定・タスク・買い物のことなど、何でも気軽に話しかけてくださいね！';
  }

  if (lower.match(/ありがとう|助かる|助かった|嬉しい|よかった/)) {
    return 'お役に立ててよかったです 🌸 いつでも声をかけてくださいね！';
  }

  if (lower.match(/疲れ|つらい|大変|しんど|つかれ/)) {
    return 'いつもご家族のために頑張っているんですね 🌸\n無理しすぎず、少し休んでくださいね。Hokuはいつでもここにいます。';
  }

  const defaults = [
    'ご家族のために何でも聞いてくださいね 🌸 予定・タスク・買い物など気軽にどうぞ！',
    'ご家族の毎日が少しでも楽になるよう、全力でサポートします 🌸',
    '何かお手伝いできることはありますか？今日も素敵な一日になりますように 🌸',
    'いつもご家族のために頑張っていますね。今日も一緒に頑張りましょう 🌸',
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
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
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isTyping) return;
    haptic.light();
    const now = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: text.trim(), time: now };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

    const delay = 700 + Math.random() * 700;
    setTimeout(() => {
      const hokuMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'hoku',
        text: generateHokuResponse(text, context),
        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      };
      setIsTyping(false);
      setMessages(prev => [...prev, hokuMsg]);
      haptic.selection();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }, delay);
  }, [isTyping, context]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.hokuEmoji}>🌸</Text>
          <View>
            <Text style={styles.headerTitle}>Hoku</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>オンライン</Text>
            </View>
          </View>
        </View>
        <View style={{ width: 32 }} />
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
              entering={FadeInDown.delay(i === 0 ? 0 : 40).springify().damping(20)}
              style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.hokububble]}
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

          {isTyping && (
            <Animated.View entering={FadeInDown.springify().damping(20)} style={styles.typingWrap}>
              <TypingIndicator />
            </Animated.View>
          )}
        </ScrollView>

        {/* Suggestions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestions}
        >
          {SUGGESTIONS.map(s => (
            <TouchableOpacity
              key={s}
              style={styles.suggestion}
              onPress={() => sendMessage(s)}
            >
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input bar */}
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
            style={[styles.sendBtn, (!input.trim() || isTyping) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
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
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  hokuEmoji: { fontSize: 30 },
  headerTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.text },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  onlineText: { fontSize: Typography.xs, color: Colors.success },
  messages: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, gap: Spacing.sm },
  bubble: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  userBubble: { flexDirection: 'row-reverse' },
  hokububble: {},
  hokuBubbleEmoji: { fontSize: 24, marginBottom: 4 },
  bubbleContent: { maxWidth: '75%', padding: Spacing.sm, borderRadius: Radius.xl },
  hokuBubbleContent: {
    backgroundColor: Colors.card, borderBottomLeftRadius: 4, ...Shadows.sm,
  },
  userBubbleContent: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: Typography.base, color: Colors.text, lineHeight: Typography.base * 1.55 },
  userBubbleText: { color: '#fff' },
  bubbleTime: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  userBubbleTime: { color: 'rgba(255,255,255,0.65)' },
  typingWrap: { paddingHorizontal: 0 },
  suggestions: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, gap: Spacing.sm },
  suggestion: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  suggestionText: { fontSize: Typography.sm, color: Colors.primary },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingTop: Spacing.sm,
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
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
});
