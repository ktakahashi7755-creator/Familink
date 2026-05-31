import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useStore, useMembers } from '../src/store';
import { Colors, Typography, Spacing, Radius, Shadows } from '../src/constants/theme';
import { Sheet } from '../src/components/ui/Sheet';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { Avatar } from '../src/components/ui/Avatar';
import { EmptyState } from '../src/components/ui/EmptyState';

export default function BoardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const posts = useStore(s => s.posts);
  const announces = useStore(s => s.announces);
  const addAnnounce = useStore(s => s.addAnnounce);
  const deleteAnnounce = useStore(s => s.deleteAnnounce);
  const members = useMembers();
  const user = useStore(s => s.user);

  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const myMember = members.find(m => m.userId === user?.id);

  function handlePost() {
    if (!title.trim() || !myMember) return;
    addAnnounce({ title: title.trim(), body: body || undefined, memberId: myMember.id });
    setTitle('');
    setBody('');
    setShowAdd(false);
  }

  const sorted = [...announces].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>家族ボード</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)}>
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {sorted.length === 0 ? (
        <EmptyState
          icon="📢"
          title="投稿なし"
          description="家族へのお知らせや連絡を投稿しましょう"
          actionLabel="投稿する"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
          {sorted.map((ann, i) => {
            const author = members.find(m => m.id === ann.memberId);
            return (
              <Animated.View key={ann.id} entering={FadeInDown.delay(i * 40).springify().damping(18)}>
                <TouchableOpacity style={styles.card} onLongPress={() => deleteAnnounce(ann.id)}>
                  {ann.pinned && (
                    <View style={styles.pinnedBadge}>
                      <Ionicons name="pin" size={12} color={Colors.warning} />
                      <Text style={styles.pinnedText}>固定</Text>
                    </View>
                  )}
                  <Text style={styles.cardTitle}>{ann.title}</Text>
                  {ann.body && <Text style={styles.cardBody}>{ann.body}</Text>}
                  <View style={styles.cardFooter}>
                    {author && (
                      <View style={styles.authorRow}>
                        <Avatar name={author.name} color={author.color} size={18} />
                        <Text style={styles.authorName}>{author.name}</Text>
                      </View>
                    )}
                    <Text style={styles.cardDate}>
                      {new Date(ann.createdAt).toLocaleDateString('ja-JP')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      <Sheet visible={showAdd} onClose={() => setShowAdd(false)} title="お知らせを投稿">
        <View style={styles.form}>
          <Input label="タイトル" placeholder="例：明日の予定について" value={title} onChangeText={setTitle} autoFocus />
          <Input label="内容（任意）" placeholder="詳細を入力" value={body} onChangeText={setBody} multiline numberOfLines={4} />
          <Button title="投稿する" onPress={handlePost} variant="primary" size="lg" fullWidth />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm,
  },
  headerTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text },
  list: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, gap: Spacing.sm },
  card: {
    backgroundColor: Colors.card, borderRadius: Radius.xl,
    padding: Spacing.base, ...Shadows.sm,
  },
  pinnedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginBottom: Spacing.xs,
  },
  pinnedText: { fontSize: Typography.xs, color: Colors.warning, fontWeight: '600' },
  cardTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.text },
  cardBody: { fontSize: Typography.base, color: Colors.textSub, marginTop: Spacing.xs, lineHeight: Typography.base * 1.5 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorName: { fontSize: Typography.sm, color: Colors.textMuted },
  cardDate: { fontSize: Typography.xs, color: Colors.textMuted },
  form: { gap: Spacing.base, paddingBottom: 20 },
});
