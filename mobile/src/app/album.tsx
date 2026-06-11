import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
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
const FAVORITES = '__favorites__';

export default function AlbumScreen() {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const { albumPhotos, albumFolders, addPhotos, removePhotos, movePhotos, toggleFavorite, addFolder } =
    useFamilyStore();

  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [movePickerOpen, setMovePickerOpen] = useState(false);

  const photos = useMemo(() => {
    if (filter === FAVORITES) return albumPhotos.filter((p) => p.favorite);
    if (filter) return albumPhotos.filter((p) => p.folderId === filter);
    return albumPhotos;
  }, [albumPhotos, filter]);

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
      addPhotos(result.assets.map((a) => a.uri), filter && filter !== FAVORITES ? filter : undefined);
      haptic.success();
    }
  }

  async function addFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!result.canceled) {
      addPhotos(result.assets.map((a) => a.uri), filter && filter !== FAVORITES ? filter : undefined);
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

  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
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
      exitSelect();
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
      <View style={styles.toolbar}>
        <Pressable onPress={() => (selectMode ? exitSelect() : setSelectMode(true))} hitSlop={8}>
          <AppText variant="body" color={colors.primary}>
            {selectMode ? '完了' : '選択'}
          </AppText>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <Pressable onPress={addFromCamera} hitSlop={8} accessibilityLabel="カメラで撮影">
            <Ionicons name="camera-outline" size={24} color={colors.primary} />
          </Pressable>
          <Pressable onPress={addFromLibrary} hitSlop={8} accessibilityLabel="写真を追加">
            <Ionicons name="add" size={26} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderRow}>
        <FolderChip label="すべて" active={!filter} onPress={() => setFilter(undefined)} />
        <FolderChip label="お気に入り" icon="heart" active={filter === FAVORITES} onPress={() => setFilter(FAVORITES)} />
        {albumFolders.map((f) => (
          <FolderChip key={f.id} label={f.name} active={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
        <FolderChip label="＋ 新規" active={false} onPress={() => setNewFolderOpen(true)} dashed />
      </ScrollView>

      {photos.length === 0 ? (
        <EmptyState icon="heart-outline" message={filter === FAVORITES ? 'お気に入りはまだありません' : 'このフォルダは空です'} />
      ) : (
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
                const globalIndex = photos.findIndex((x) => x.id === p.id);
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
                    {p.favorite && !selectMode && (
                      <Ionicons name="heart" size={14} color="#fff" style={styles.favBadge} />
                    )}
                    {selectMode && (
                      <View style={[styles.checkOverlay, isSel && { backgroundColor: 'rgba(10,132,255,0.35)' }]}>
                        <Ionicons name={isSel ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={isSel ? colors.primary : '#fff'} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        />
      )}

      {selectMode && selected.size > 0 && (
        <View style={[styles.actionBar, { backgroundColor: colors.bgCard, borderTopColor: colors.borderLight }]}>
          <AppText variant="body">{selected.size}枚選択中</AppText>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <Pressable onPress={() => setMovePickerOpen(true)} hitSlop={8} style={styles.barAction}>
              <Ionicons name="folder-outline" size={22} color={colors.primary} />
              <AppText variant="footnote" color={colors.primary}>
                移動
              </AppText>
            </Pressable>
            <Pressable onPress={deleteSelected} hitSlop={8} style={styles.barAction}>
              <Ionicons name="trash-outline" size={22} color={colors.red} />
              <AppText variant="footnote" color={colors.red}>
                削除
              </AppText>
            </Pressable>
          </View>
        </View>
      )}

      <PhotoViewer
        key={viewerIndex ?? 'closed'}
        photos={photos}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onToggleFav={toggleFavorite}
        onDelete={async (id) => {
          const ok = await confirm({ title: 'この写真を削除', destructive: true, confirmLabel: '削除' });
          if (ok) {
            removePhotos([id]);
            setViewerIndex(null);
          }
        }}
      />

      <NameInputModal
        visible={newFolderOpen}
        title="新しいフォルダ"
        placeholder="フォルダ名"
        onClose={() => setNewFolderOpen(false)}
        onSubmit={(name) => {
          const id = addFolder(name);
          setNewFolderOpen(false);
          setFilter(id);
        }}
      />

      <FolderPickerModal
        visible={movePickerOpen}
        folders={albumFolders}
        onClose={() => setMovePickerOpen(false)}
        onPick={(folderId) => {
          movePhotos([...selected], folderId);
          setMovePickerOpen(false);
          exitSelect();
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
  onToggleFav,
}: {
  photos: AlbumPhoto[];
  index: number | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleFav: (id: string) => void;
}) {
  const listRef = useRef<FlatList>(null);
  const [current, setCurrent] = useState(index ?? 0);

  if (index === null) return null;
  const photo = photos[current];

  async function share() {
    if (!photo) return;
    try {
      await Share.share({ url: photo.uri, message: photo.caption ?? '' });
    } catch {
      // user cancelled / unsupported — ignore
    }
  }

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
              <ZoomableImage uri={item.uri} width={SCREEN_W} height={SCREEN_H * 0.82} />
            </View>
          )}
        />
        <SafeAreaView edges={['top']} style={styles.viewerBar}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="閉じる">
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 22 }}>
            <Pressable onPress={() => photo && onToggleFav(photo.id)} hitSlop={12} accessibilityLabel="お気に入り">
              <Ionicons name={photo?.favorite ? 'heart' : 'heart-outline'} size={26} color={photo?.favorite ? '#FF2D55' : '#fff'} />
            </Pressable>
            <Pressable onPress={share} hitSlop={12} accessibilityLabel="共有">
              <Ionicons name="share-outline" size={26} color="#fff" />
            </Pressable>
            <Pressable onPress={() => photo && onDelete(photo.id)} hitSlop={12} accessibilityLabel="削除">
              <Ionicons name="trash-outline" size={26} color="#fff" />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function FolderChip({
  label,
  active,
  onPress,
  icon,
  dashed,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  dashed?: boolean;
}) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.folderChip,
        {
          backgroundColor: active ? colors.primary : colors.bgMuted,
          borderRadius: radius.full,
          borderWidth: dashed ? 1 : 0,
          borderColor: colors.border,
          borderStyle: dashed ? 'dashed' : 'solid',
        },
      ]}>
      {icon && <Ionicons name={icon} size={13} color={active ? '#fff' : colors.text} />}
      <AppText variant="footnote" color={active ? '#fff' : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

function NameInputModal({
  visible,
  title,
  placeholder,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const { colors, radius } = useTheme();
  const [value, setValue] = useState('');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.centerBackdrop}>
        <View style={[styles.dialog, { backgroundColor: colors.bgCard, borderRadius: radius.lg }]}>
          <AppText variant="title3" style={{ textAlign: 'center' }}>
            {title}
          </AppText>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            autoFocus
            style={[styles.dialogInput, { color: colors.text, backgroundColor: colors.bgInset, borderRadius: radius.sm }]}
          />
          <Button
            title="作成"
            onPress={() => {
              if (value.trim()) {
                onSubmit(value.trim());
                setValue('');
              }
            }}
          />
          <Button title="キャンセル" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function FolderPickerModal({
  visible,
  folders,
  onClose,
  onPick,
}: {
  visible: boolean;
  folders: { id: string; name: string }[];
  onClose: () => void;
  onPick: (folderId?: string) => void;
}) {
  const { colors, radius } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
          <View style={styles.sheetHandle} />
          <AppText variant="title3">フォルダへ移動</AppText>
          <Pressable onPress={() => onPick(undefined)} style={[styles.pickRow, { borderBottomColor: colors.borderLight }]}>
            <Ionicons name="albums-outline" size={20} color={colors.textSub} />
            <AppText variant="body">フォルダなし（すべて）</AppText>
          </Pressable>
          {folders.map((f) => (
            <Pressable key={f.id} onPress={() => onPick(f.id)} style={[styles.pickRow, { borderBottomColor: colors.borderLight }]}>
              <Ionicons name="folder-outline" size={20} color={colors.primary} />
              <AppText variant="body">{f.name}</AppText>
            </Pressable>
          ))}
          {folders.length === 0 && (
            <AppText variant="footnote" muted style={{ paddingVertical: 8 }}>
              フォルダがありません。アルバム上部の「＋ 新規」で作成できます。
            </AppText>
          )}
          <Button title="キャンセル" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
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
  folderChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 7 },
  favBadge: { position: 'absolute', bottom: 4, right: 4, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 },
  checkOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'flex-end', justifyContent: 'flex-start', padding: 4 },
  actionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  barAction: { alignItems: 'center', gap: 2 },
  viewer: { flex: 1, backgroundColor: '#000' },
  viewerBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  centerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  dialog: { width: '100%', maxWidth: 360, padding: 24, gap: 12 },
  dialogInput: { padding: 12, fontSize: 16 },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { padding: 20, gap: 8, paddingBottom: 36 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(120,120,128,0.4)', marginBottom: 8 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
});
