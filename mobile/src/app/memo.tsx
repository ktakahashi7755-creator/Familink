import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, EmptyState, FAB } from '@/components/ui';
import { useConfirm } from '@/components/ConfirmProvider';
import { useFamilyStore } from '@/store/useFamilyStore';
import { useTheme } from '@/theme/ThemeContext';
import type { Memo } from '@/types';

export default function MemoScreen() {
  const { colors, radius } = useTheme();
  const confirm = useConfirm();
  const { memos, addMemo, updateMemo, removeMemo } = useFamilyStore();
  const [editing, setEditing] = useState<Memo | 'new' | null>(null);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}>
        {memos.length === 0 ? (
          <EmptyState icon="document-text-outline" message="家族で共有するメモ。買い物の覚書や連絡事項に。" />
        ) : (
          memos.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => setEditing(m)}
              style={[styles.card, { backgroundColor: colors.bgCard, borderRadius: radius.md }]}>
              <AppText variant="headline" numberOfLines={1}>
                {m.title || '（無題）'}
              </AppText>
              {!!m.body && (
                <AppText variant="footnote" muted numberOfLines={2}>
                  {m.body}
                </AppText>
              )}
              <AppText variant="caption" muted>
                {new Date(m.updatedAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
              </AppText>
            </Pressable>
          ))
        )}
      </ScrollView>

      <FAB onPress={() => setEditing('new')} icon="create" />

      <MemoEditor
        memo={editing === 'new' ? null : editing}
        visible={editing !== null}
        onClose={() => setEditing(null)}
        onSave={(title, body) => {
          if (editing && editing !== 'new') updateMemo(editing.id, { title, body });
          else addMemo({ title, body });
          setEditing(null);
        }}
        onDelete={
          editing && editing !== 'new'
            ? async () => {
                if (await confirm({ title: 'メモを削除', destructive: true, confirmLabel: '削除' })) {
                  removeMemo(editing.id);
                  setEditing(null);
                }
              }
            : undefined
        }
      />
    </SafeAreaView>
  );
}

function MemoEditor({
  memo,
  visible,
  onClose,
  onSave,
  onDelete,
}: {
  memo: Memo | null;
  visible: boolean;
  onClose: () => void;
  onSave: (title: string, body: string) => void;
  onDelete?: () => void;
}) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  // Sync fields when the target memo changes.
  const key = memo?.id ?? 'new';
  const [lastKey, setLastKey] = useState(key);
  if (visible && key !== lastKey) {
    setTitle(memo?.title ?? '');
    setBody(memo?.body ?? '');
    setLastKey(key);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.nav}>
          <Pressable onPress={onClose} hitSlop={12}>
            <AppText variant="body" color={colors.primary}>
              閉じる
            </AppText>
          </Pressable>
          <Pressable onPress={() => onSave(title, body)} hitSlop={12}>
            <AppText variant="headline" color={colors.primary}>
              保存
            </AppText>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="タイトル"
            placeholderTextColor={colors.textMuted}
            style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="メモを入力…"
            placeholderTextColor={colors.textMuted}
            multiline
            style={{ color: colors.text, fontSize: 17, lineHeight: 24, minHeight: 200, textAlignVertical: 'top' }}
          />
          {onDelete && <Button title="削除" variant="danger" icon="trash" onPress={onDelete} />}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 4 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
});
