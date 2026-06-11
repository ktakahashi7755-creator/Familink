import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, EmptyState } from '@/components/ui';
import { useFamilyStore } from '@/store/useFamilyStore';
import { useTheme } from '@/theme/ThemeContext';

const GAP = 2;
const COLS = 3;

export default function AlbumScreen() {
  const { colors } = useTheme();
  const { albumPhotos, addPhotos, removePhoto } = useFamilyStore();
  const [viewer, setViewer] = useState<string | null>(null);

  const size = (Dimensions.get('window').width - GAP * (COLS - 1)) / COLS;

  async function pick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.9,
      selectionLimit: 20,
    });
    if (!result.canceled) {
      addPhotos(result.assets.map((a) => a.uri));
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {albumPhotos.length === 0 ? (
        <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 16 }}>
          <EmptyState icon="images-outline" message="家族の思い出をここに集めましょう" />
          <Button title="写真を追加" icon="add" onPress={pick} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
            {albumPhotos.map((p) => (
              <Pressable key={p.id} onPress={() => setViewer(p.uri)}>
                <Image
                  source={{ uri: p.uri }}
                  style={{ width: size, height: size }}
                  contentFit="cover"
                  transition={120}
                />
              </Pressable>
            ))}
          </ScrollView>
          <Pressable onPress={pick} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </>
      )}

      {/* Full-screen viewer */}
      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <View style={styles.viewer}>
          {viewer && <Image source={{ uri: viewer }} style={styles.viewerImg} contentFit="contain" />}
          <SafeAreaView edges={['top']} style={styles.viewerBar}>
            <Pressable onPress={() => setViewer(null)} hitSlop={12}>
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => {
                const target = albumPhotos.find((p) => p.uri === viewer);
                if (target) removePhoto(target.id);
                setViewer(null);
              }}
              hitSlop={12}>
              <Ionicons name="trash-outline" size={26} color="#fff" />
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  viewerImg: { width: '100%', height: '100%' },
  viewerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});
