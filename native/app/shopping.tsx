import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useStore, useShopping } from '../src/store';
import { Colors, Typography, Spacing, Radius, Shadows } from '../src/constants/theme';
import { EmptyState } from '../src/components/ui/EmptyState';

export default function ShoppingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const items = useShopping();
  const addShopping = useStore(s => s.addShopping);
  const toggleShopping = useStore(s => s.toggleShopping);
  const deleteShopping = useStore(s => s.deleteShopping);
  const clearDoneShopping = useStore(s => s.clearDoneShopping);

  const [input, setInput] = useState('');
  const [qty, setQty] = useState('');

  const pending = items.filter(i => !i.done);
  const done = items.filter(i => i.done);

  function handleAdd() {
    if (!input.trim()) return;
    addShopping({ name: input.trim(), done: false, quantity: qty ? Number(qty) : undefined });
    setInput('');
    setQty('');
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>買い物リスト</Text>
        {done.length > 0 && (
          <TouchableOpacity onPress={clearDoneShopping}>
            <Text style={styles.clearBtn}>完了を削除</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick add */}
      <View style={styles.quickAdd}>
        <TextInput
          style={styles.nameInput}
          placeholder="商品名を入力"
          placeholderTextColor={Colors.textPlaceholder}
          value={input}
          onChangeText={setInput}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <TextInput
          style={styles.qtyInput}
          placeholder="数量"
          placeholderTextColor={Colors.textPlaceholder}
          value={qty}
          onChangeText={setQty}
          keyboardType="numeric"
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity
          style={[styles.addBtn, !input.trim() && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={!input.trim()}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="買い物リストが空です"
          description="上の入力欄から商品を追加できます"
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Pending */}
          {pending.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>未購入 ({pending.length})</Text>
              <View style={styles.itemList}>
                {pending.map((item, i) => (
                  <Animated.View
                    key={item.id}
                    entering={FadeInDown.delay(i * 30).springify().damping(18)}
                    layout={Layout.springify()}
                  >
                    <ShoppingItem
                      item={item}
                      onToggle={() => toggleShopping(item.id)}
                      onDelete={() => deleteShopping(item.id)}
                    />
                  </Animated.View>
                ))}
              </View>
            </View>
          )}

          {/* Done */}
          {done.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>購入済み ({done.length})</Text>
              <View style={styles.itemList}>
                {done.map((item, i) => (
                  <Animated.View
                    key={item.id}
                    entering={FadeInDown.delay(i * 30).springify().damping(18)}
                    layout={Layout.springify()}
                  >
                    <ShoppingItem
                      item={item}
                      onToggle={() => toggleShopping(item.id)}
                      onDelete={() => deleteShopping(item.id)}
                    />
                  </Animated.View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function ShoppingItem({ item, onToggle, onDelete }: { item: any; onToggle: () => void; onDelete: () => void }) {
  return (
    <TouchableOpacity style={styles.item} onLongPress={onDelete} activeOpacity={0.7}>
      <TouchableOpacity onPress={onToggle} hitSlop={8}>
        <View style={[styles.check, item.done && styles.checkDone]}>
          {item.done && <Ionicons name="checkmark" size={13} color="#fff" />}
        </View>
      </TouchableOpacity>
      <Text style={[styles.itemName, item.done && styles.itemNameDone]} numberOfLines={1}>
        {item.name}
      </Text>
      {item.quantity && (
        <Text style={styles.itemQty}>{item.quantity}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm,
  },
  headerTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text },
  clearBtn: { fontSize: Typography.sm, color: Colors.error },
  quickAdd: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, marginBottom: Spacing.base,
  },
  nameInput: {
    flex: 1, backgroundColor: Colors.card,
    borderRadius: Radius.lg, paddingHorizontal: Spacing.base,
    paddingVertical: 10, fontSize: Typography.base, color: Colors.text,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  qtyInput: {
    width: 70, backgroundColor: Colors.card,
    borderRadius: Radius.lg, paddingHorizontal: Spacing.sm,
    paddingVertical: 10, fontSize: Typography.base, color: Colors.text,
    borderWidth: 1, borderColor: Colors.borderLight,
    textAlign: 'center',
  },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: Colors.border },
  list: { paddingHorizontal: Spacing.base },
  section: { marginBottom: Spacing.xl },
  sectionLabel: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textMuted, marginBottom: Spacing.sm },
  itemList: { backgroundColor: Colors.card, borderRadius: Radius.xl, overflow: 'hidden', ...Shadows.sm },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight,
  },
  check: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  itemName: { flex: 1, fontSize: Typography.base, color: Colors.text },
  itemNameDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  itemQty: { fontSize: Typography.sm, color: Colors.textMuted },
});
