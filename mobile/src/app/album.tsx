import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Modal, Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useConfirm } from '@/components/ConfirmProvider';
import { AppText, Button, EmptyState } from '@/components/ui';
import { ZoomableImage } from '@/features/album/ZoomableImage';
import { haptic } from '@/lib/haptics';
import { useFamilyStore } from '@/store/useFamilyStore';
import { useTheme } from '@/theme/ThemeContext';
import type { AlbumPhoto } from '@/types';

const GAP = 2;
const COLS = 3;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CELL = (SCREEN_W - GAP * (COLS - 1)) / COLS;

export default function AlbumScreen() {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const { albumPhotos, albumFolders, addPhotos, removePhotos } = useFamilyStore();

  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const photos = useMemo(
    () => (folderId ? albumPhotos.filter((p) => p.folderId === folderId) : albumPhotos),
    [albumPhotos, folderId],
  );

  // Group by month for section headers (newest first).
  const sections = useMemo(() => {
    const map = new Map<string, AlbumPhoto[]>();
    for (const p of photos) {
      const key = (p.takenAt ?? p.createdAt ?? '').slice(0, 7) || '不明';
      (map.get(key) ?? map.set(key, []).get(key)!).push(p);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, data]) => ({ title: monthLabel(key), data: chunk(data, COLS) }));
  }, [photos]);

  const flatPhotos = photos;

  async function addFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.9,
      selectionLimit: 30,
    });
    if (!result.canceled) {
      addPhotos(result.assets.map((a) => a.uri), folderId);
      haptic.success();
    }
  }

  async function addFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!result.canceled) {
      addPhotos(result.assets.map((a) => a.uri), folderId);
      haptic.success();
    }
  }

  function toggleSelect(id: string) {
    haptic.selection();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    const ids = [...selected];
    if (!ids.length) return;
    const ok = await confirm({
      title: `${ids.length}枚の写真を削除`,
      message: 'この操作は取り消せません。',
      destructive: true,
      confirmLabel: '削除',
    });
    if (ok) {
      removePhotos(ids);
      setSelected(new Set());
      setSelectMode(false);
    }
  }

  if (albumPhotos.length === 0) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 16 }}>
          <EmptyState icon="images-outline" message="家族の思い出をここに集めましょう" />
          <Button title="写真を追加" icon="images" onPress={addFromLibrary} />
          <Button title="カメラで撮影" icon="camera" variant="secondary" onPress={addFromCamera} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* toolbar */}
      <View style={styles.toolbar}>
        <Pressable
          onPress={() => {
            setSelectMode((v) => !v);
            setSelected(new Set());
          }}
          hitSlop={8}>
          <AppText variant="body" color={colors.primary}>
            {selectMode ? '完了' : '選択'}
          </AppText>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <Pressable onPress={addFromCamera} hitSlop={8}>
            <Ionicons name="camera-outline" size={24} color={colors.primary} />
          </Pressable>
          <Pressable onPress={addFromLibrary} hitSlop={8}>
            <Ionicons name="add" size={26} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* folder chips */}
      {albumFolders.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderRow}>
          <FolderChip label="すべて" active={!folderId} onPress={() => setFolderId(undefined)} />
          {albumFolders.map((f) => (
            <FolderChip key={f.id} label={f.name} active={folderId === f.id} onPress={() => setFolderId(f.id)} />
          ))}
        </ScrollView>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(row, i) => row.map((p) => p.id).join('-') + i}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <AppText variant="headline" style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
            {section.title}
          </AppText>
        )}
        renderItem={({ item: row }) => (
          <View style={{ flexDirection: 'row', gap: GAP, marginBottom: GAP }}>
            {row.map((p) => {
              const globalIndex = flatPhotos.findIndex((x) => x.id === p.id);
              const isSel = selected.has(p.id);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => (selectMode ? toggleSelect(p.id) : setViewerIndex(globalIndex))}
                  onLongPress={() => {
                    setSelectMode(true);
                    toggleSelect(p.id);
                  }}>
                  <Image source={{ uri: p.uri }} style={{ width: CELL, height: CELL }} contentFit="cover" transition={120} />
                  {selectMode && (
                    <View style={[styles.checkOverlay, isSel && { backgroundColor: 'rgba(10,132,255,0.35)' }]}>
                      <Ionicons
                        name={isSel ? 'checkmark-circle' : 'ellipse-outline'}
                        size={24}
                        color={isSel ? colors.primary : '#fff'}
                      />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      />

      {/* selection action bar */}
      {selectMode && selected.size > 0 && (
        <View style={[styles.actionBar, { backgroundColor: colors.bgCard, borderTopColor: colors.borderLight }]}>
          <AppText variant="body">{selected.size}枚選択中</AppText>
          <Pressable onPress={deleteSelected} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="trash-outline" size={22} color={colors.red} />
            <AppText variant="body" color={colors.red}>
              削除
            </AppText>
          </Pressable>
        </View>
      )}

      <PhotoViewer
        photos={flatPhotos}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onDelete={async (id) => {
          const ok = await confirm({ title: 'この写真を削除', destructive: true, confirmLabel: '削除' });
          if (ok) {
            removePhotos([id]);
            setViewerIndex(null);
          }
        }}
      />
    </SafeAreaView>
  );
}

function PhotoViewer({
  photos,
  index,
  onClose,
  onDelete,
}: {
  photos: AlbumPhoto[];
  index: number | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const listRef = useRef<FlatList>(null);
  const [current, setCurrent] = useState(index ?? 0);

  if (index === null) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.viewer}>
        <FlatList
          ref={listRef}
          data={photos}
          horizontal
          pagingEnabled
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(p) => p.id}
          onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
          renderItem={({ item }) => (
            <View style={{ width: SCREEN_W, height: SCREEN_H, alignItems: 'center', justifyContent: 'center' }}>
              <ZoomableImage uri={item.uri} width={SCREEN_W} height={SCREEN_H * 0.85} />
            </View>
          )}
        />
        <SafeAreaView edges={['top']} style={styles.viewerBar}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <Pressable onPress={() => photos[current] && onDelete(photos[current].id)} hitSlop={12}>
            <Ionicons name="trash-outline" size={26} color="#fff" />
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function FolderChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.folderChip, { backgroundColor: active ? colors.primary : colors.bgMuted, borderRadius: radius.full }]}>
      <AppText variant="footnote" color={active ? '#fff' : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

function monthLabel(key: string): string {
  if (key === '不明' || !key.includes('-')) return 'その他';
  const [y, m] = key.split('-');
  return `${y}年${Number(m)}月`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  folderRow: { gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  folderChip: { paddingHorizontal: 16, paddingVertical: 7 },
  checkOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'flex-end', justifyContent: 'flex-start', padding: 4 },
  actionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  viewer: { flex: 1, backgroundColor: '#000' },
  viewerBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
});
