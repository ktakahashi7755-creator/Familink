import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore, useMemos, useMemoFolders } from '../../src/store';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';

export default function MemoEditModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, folderId: initialFolderId } = useLocalSearchParams<{ id?: string; folderId?: string }>();

  const memos = useMemos();
  const folders = useMemoFolders();
  const addMemo = useStore(s => s.addMemo);
  const updateMemo = useStore(s => s.updateMemo);
  const deleteMemo = useStore(s => s.deleteMemo);

  const existing = id ? memos.find(m => m.id === id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [folderId, setFolderId] = useState<string | undefined>(existing?.folderId ?? initialFolderId);
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  const selectedFolder = folderId ? folders.find(f => f.id === folderId) : undefined;

  function handleSave() {
    const t = title.trim() || body.trim().slice(0, 30) || '無題のメモ';
    const data = { title: t, body: body.trim(), folderId };
    if (existing) {
      updateMemo(existing.id, data);
    } else {
      addMemo(data);
    }
    router.back();
  }

  function handleDelete() {
    if (existing) deleteMemo(existing.id);
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.toolBtn}>
            <Ionicons name="chevron-down" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.toolRight}>
            {existing && (
              <TouchableOpacity onPress={handleDelete} style={styles.toolBtn}>
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleSave} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>完了</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Title */}
        <TextInput
          style={styles.titleInput}
          placeholder="タイトル"
          placeholderTextColor={Colors.textPlaceholder}
          value={title}
          onChangeText={setTitle}
          returnKeyType="next"
          autoFocus={!existing}
          maxLength={100}
        />

        {/* Folder tag */}
        <TouchableOpacity
          style={styles.folderTag}
          onPress={() => setShowFolderPicker(!showFolderPicker)}
        >
          <Ionicons
            name="folder-outline"
            size={14}
            color={selectedFolder ? Colors.warning : Colors.textMuted}
          />
          <Text style={[styles.folderTagText, selectedFolder && { color: Colors.warning }]}>
            {selectedFolder?.name ?? 'フォルダなし'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Folder picker */}
        {showFolderPicker && (
          <View style={styles.folderPicker}>
            <TouchableOpacity
              style={styles.folderOption}
              onPress={() => { setFolderId(undefined); setShowFolderPicker(false); }}
            >
              <Text style={[styles.folderOptionText, !folderId && styles.folderOptionSelected]}>
                フォルダなし
              </Text>
            </TouchableOpacity>
            {folders.map(f => (
              <TouchableOpacity
                key={f.id}
                style={styles.folderOption}
                onPress={() => { setFolderId(f.id); setShowFolderPicker(false); }}
              >
                <Ionicons name="folder" size={16} color={Colors.warning} />
                <Text style={[styles.folderOptionText, folderId === f.id && styles.folderOptionSelected]}>
                  {f.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Body */}
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.bodyInput}
            placeholder="メモを入力..."
            placeholderTextColor={Colors.textPlaceholder}
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
          />
        </ScrollView>

        {/* Bottom date */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={styles.footerDate}>
            {existing
              ? `更新 ${new Date(existing.updatedAt).toLocaleDateString('ja-JP')}`
              : '新規メモ'
            }
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.card },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight,
  },
  toolBtn: { padding: 4 },
  toolRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  doneBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: Radius.full,
  },
  doneBtnText: { color: '#fff', fontSize: Typography.sm, fontWeight: '700' },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  folderTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  folderTagText: { fontSize: Typography.xs, color: Colors.textMuted },
  folderPicker: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.bgMuted,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  folderOption: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: Spacing.sm, paddingHorizontal: Spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight,
  },
  folderOptionText: { fontSize: Typography.sm, color: Colors.text },
  folderOptionSelected: { color: Colors.primary, fontWeight: '600' },
  bodyInput: {
    fontSize: Typography.base,
    color: Colors.text,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
    lineHeight: Typography.base * 1.7,
    minHeight: 300,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
  },
  footerDate: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center' },
});
