import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useStore, useMemos, useMemoFolders } from '../../src/store';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../src/constants/theme';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Sheet } from '../../src/components/ui/Sheet';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { haptic } from '../../src/utils/haptics';
import type { Memo, MemoFolder } from '../../src/types';

export default function MemoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const memos = useMemos();
  const folders = useMemoFolders();
  const addMemoFolder = useStore(s => s.addMemoFolder);
  const deleteFolder = useStore(s => s.deleteMemoFolder);
  const deleteMemo = useStore(s => s.deleteMemo);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showFolderCreate, setShowFolderCreate] = useState(false);
  const [folderName, setFolderName] = useState('');

  const rootFolders = folders.filter(f => !f.parentId);
  const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;
  const subFolders = folders.filter(f => f.parentId === currentFolderId);

  const folderMemos = useMemo(() => {
    if (query) {
      return memos.filter(m =>
        (m.title ?? '').toLowerCase().includes(query.toLowerCase()) ||
        m.body?.toLowerCase().includes(query.toLowerCase()),
      );
    }
    return memos.filter(m => (m.folderId ?? null) === currentFolderId);
  }, [memos, currentFolderId, query]);

  const handleCreateFolder = useCallback(() => {
    if (!folderName.trim()) return;
    haptic.success();
    addMemoFolder({ name: folderName.trim(), parentId: currentFolderId ?? undefined });
    setFolderName('');
    setShowFolderCreate(false);
  }, [folderName, currentFolderId, addMemoFolder]);

  const showingFolders = !query && (currentFolderId ? subFolders : rootFolders);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          {currentFolder && (
            <TouchableOpacity onPress={() => { haptic.light(); setCurrentFolderId(null); }} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>{currentFolder?.name ?? 'メモ'}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => { haptic.light(); setShowFolderCreate(true); }}
            hitSlop={8}
          >
            <Ionicons name="folder-open-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { haptic.light(); router.push('/modals/memo-edit'); }}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="メモを検索"
          placeholderTextColor={Colors.textPlaceholder}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Folders */}
        {showingFolders && showingFolders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>フォルダ</Text>
            <View style={styles.folderList}>
              {showingFolders.map((folder, i) => (
                <Animated.View
                  key={folder.id}
                  entering={FadeInDown.delay(i * 30).springify().damping(18)}
                  layout={Layout.springify()}
                >
                  <FolderRow
                    folder={folder}
                    memoCount={memos.filter(m => m.folderId === folder.id).length}
                    onPress={() => { haptic.light(); setCurrentFolderId(folder.id); }}
                    onDelete={() => { haptic.warning(); deleteFolder(folder.id); }}
                  />
                </Animated.View>
              ))}
            </View>
          </View>
        )}

        {/* Memos */}
        {(folderMemos.length > 0 || query) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {query ? `検索結果 (${folderMemos.length})` : `メモ (${folderMemos.length})`}
            </Text>
            {folderMemos.length === 0 ? (
              <View style={styles.noMemos}>
                <Text style={styles.noMemosText}>一致するメモがありません</Text>
              </View>
            ) : (
              <View style={styles.memoList}>
                {folderMemos.map((memo, i) => (
                  <Animated.View
                    key={memo.id}
                    entering={FadeInDown.delay(i * 30).springify().damping(18)}
                    layout={Layout.springify()}
                  >
                    <MemoRow
                      memo={memo}
                      onPress={() => { haptic.light(); router.push({ pathname: '/modals/memo-edit', params: { id: memo.id } }); }}
                      onDelete={() => { haptic.warning(); deleteMemo(memo.id); }}
                    />
                  </Animated.View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Empty state */}
        {!query && folderMemos.length === 0 && (showingFolders ? showingFolders.length === 0 : true) && (
          <EmptyState
            icon="📝"
            title="メモなし"
            description="右上のアイコンからメモを追加できます"
            actionLabel="メモを作成"
            onAction={() => router.push('/modals/memo-edit')}
          />
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={() => { haptic.medium(); router.push('/modals/memo-edit'); }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Folder creation sheet */}
      <Sheet
        visible={showFolderCreate}
        onClose={() => { setFolderName(''); setShowFolderCreate(false); }}
        title="新しいフォルダ"
      >
        <View style={styles.sheetContent}>
          <Input
            label="フォルダ名"
            placeholder="例：学校・習い事・家計"
            value={folderName}
            onChangeText={setFolderName}
            autoFocus
          />
          <Button
            title="作成する"
            onPress={handleCreateFolder}
            variant="primary"
            size="lg"
            fullWidth
          />
        </View>
      </Sheet>
    </View>
  );
}

function FolderRow({
  folder,
  memoCount,
  onPress,
  onDelete,
}: {
  folder: MemoFolder;
  memoCount: number;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity style={styles.folderRow} onPress={onPress} onLongPress={onDelete} activeOpacity={0.7}>
      <View style={styles.folderIcon}>
        <Ionicons name="folder" size={24} color={Colors.warning} />
      </View>
      <Text style={styles.folderName} numberOfLines={1}>{folder.name}</Text>
      <Text style={styles.folderCount}>{memoCount}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

function MemoRow({
  memo,
  onPress,
  onDelete,
}: {
  memo: Memo;
  onPress: () => void;
  onDelete: () => void;
}) {
  const preview = memo.body?.replace(/\n/g, ' ').trim().slice(0, 60) ?? '';
  const date = memo.updatedAt
    ? new Date(memo.updatedAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
    : '';

  return (
    <TouchableOpacity style={styles.memoRow} onPress={onPress} onLongPress={onDelete} activeOpacity={0.7}>
      <View style={styles.memoContent}>
        <Text style={styles.memoTitle} numberOfLines={1}>{memo.title || '無題のメモ'}</Text>
        {preview ? (
          <Text style={styles.memoPreview} numberOfLines={2}>{preview}</Text>
        ) : null}
        <Text style={styles.memoDate}>{date}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={Colors.borderLight} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: Typography.xl, fontWeight: '700', color: Colors.text },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.text,
    padding: 0,
  },
  list: { paddingHorizontal: Spacing.base, paddingTop: 4 },
  section: { marginBottom: Spacing.xl },
  sectionLabel: {
    fontSize: Typography.sm, fontWeight: '600',
    color: Colors.textMuted, marginBottom: Spacing.sm,
    paddingLeft: 4,
  },
  folderList: { backgroundColor: Colors.card, borderRadius: Radius.xl, overflow: 'hidden', ...Shadows.sm },
  folderRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight,
  },
  folderIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  folderName: { flex: 1, fontSize: Typography.base, fontWeight: '500', color: Colors.text },
  folderCount: { fontSize: Typography.sm, color: Colors.textMuted },
  memoList: { backgroundColor: Colors.card, borderRadius: Radius.xl, overflow: 'hidden', ...Shadows.sm },
  memoRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  memoContent: { flex: 1 },
  memoTitle: { fontSize: Typography.base, fontWeight: '600', color: Colors.text },
  memoPreview: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },
  memoDate: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 4 },
  noMemos: { padding: Spacing.base, alignItems: 'center' },
  noMemosText: { fontSize: Typography.sm, color: Colors.textMuted },
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  sheetContent: { gap: Spacing.base, paddingBottom: 24 },
});
