import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Card, EmptyState } from '@/components/ui';
import { Segmented } from '@/components/Segmented';
import { haptic } from '@/lib/haptics';
import { useFamilyStore } from '@/store/useFamilyStore';
import { useTheme } from '@/theme/ThemeContext';

type Tab = 'tasks' | 'board';

export default function BoardScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('tasks');

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: 16, gap: 16, flex: 1 }}>
        <AppText variant="largeTitle">家族ボード</AppText>
        <Segmented<Tab>
          options={[
            { key: 'tasks', label: 'やること' },
            { key: 'board', label: 'お知らせ' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'tasks' ? <TasksPane /> : <PostsPane />}
      </View>
    </SafeAreaView>
  );
}

function TasksPane() {
  const { colors, radius } = useTheme();
  const { tasks, addTask, toggleTask, removeTask } = useFamilyStore();
  const [text, setText] = useState('');

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  function submit() {
    if (!text.trim()) return;
    addTask({ title: text.trim() });
    haptic.light();
    setText('');
  }

  return (
    <View style={{ flex: 1, gap: 12 }}>
      <View style={[styles.inputRow, { backgroundColor: colors.bgCard, borderRadius: radius.md }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="やることを追加"
          placeholderTextColor={colors.textMuted}
          style={{ flex: 1, color: colors.text, fontSize: 16 }}
          onSubmitEditing={submit}
          returnKeyType="done"
        />
        <Pressable onPress={submit} hitSlop={8}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 24 }}>
        {open.length === 0 && done.length === 0 ? (
          <EmptyState icon="checkbox-outline" message="やることを追加して家族で共有しましょう" />
        ) : (
          <>
            {open.map((t) => (
              <TaskRow key={t.id} title={t.title} done={false} onToggle={() => { haptic.selection(); toggleTask(t.id); }} onDelete={() => removeTask(t.id)} />
            ))}
            {done.length > 0 && (
              <AppText variant="footnote" muted style={{ marginTop: 12 }}>
                完了済み {done.length}
              </AppText>
            )}
            {done.map((t) => (
              <TaskRow key={t.id} title={t.title} done onToggle={() => { haptic.selection(); toggleTask(t.id); }} onDelete={() => removeTask(t.id)} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function TaskRow({
  title,
  done,
  onToggle,
  onDelete,
}: {
  title: string;
  done: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.taskRow, { backgroundColor: colors.bgCard, borderRadius: radius.md }]}>
      <Pressable onPress={onToggle} hitSlop={8}>
        <Ionicons
          name={done ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={done ? colors.secondary : colors.textMuted}
        />
      </Pressable>
      <AppText
        variant="body"
        style={{ flex: 1, textDecorationLine: done ? 'line-through' : 'none' }}
        muted={done}>
        {title}
      </AppText>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function PostsPane() {
  const { colors, radius } = useTheme();
  const { posts, addPost, removePost, togglePin } = useFamilyStore();
  const [text, setText] = useState('');

  function submit() {
    if (!text.trim()) return;
    addPost({ text: text.trim() });
    setText('');
  }

  const sorted = [...posts].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <View style={{ flex: 1, gap: 12 }}>
      <View style={[styles.inputRow, { backgroundColor: colors.bgCard, borderRadius: radius.md }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="家族へのお知らせを書く"
          placeholderTextColor={colors.textMuted}
          style={{ flex: 1, color: colors.text, fontSize: 16 }}
          multiline
        />
        <Pressable onPress={submit} hitSlop={8}>
          <Ionicons name="send" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
        {sorted.length === 0 ? (
          <EmptyState icon="chatbubbles-outline" message="家族みんなで使う伝言ボードです" />
        ) : (
          sorted.map((p) => (
            <Card key={p.id}>
              <View style={styles.postHeader}>
                {p.pinned && <Ionicons name="pin" size={14} color={colors.accent} />}
                <AppText variant="caption" muted style={{ flex: 1 }}>
                  {new Date(p.createdAt).toLocaleString('ja-JP', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </AppText>
                <Pressable onPress={() => togglePin(p.id)} hitSlop={8}>
                  <Ionicons name={p.pinned ? 'pin' : 'pin-outline'} size={18} color={colors.textMuted} />
                </Pressable>
                <Pressable onPress={() => removePost(p.id)} hitSlop={8}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
              <AppText variant="body">{p.text}</AppText>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
});
