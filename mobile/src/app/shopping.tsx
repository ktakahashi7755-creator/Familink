import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, EmptyState } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { useFamilyStore } from '@/store/useFamilyStore';
import { useTheme } from '@/theme/ThemeContext';

export default function ShoppingScreen() {
  const { colors, radius } = useTheme();
  const { shoppingItems, addShopping, toggleShopping, removeShopping, clearDoneShopping } =
    useFamilyStore();
  const [text, setText] = useState('');

  const left = shoppingItems.filter((i) => !i.done);
  const done = shoppingItems.filter((i) => i.done);

  function submit() {
    if (!text.trim()) return;
    addShopping(text.trim());
    haptic.light();
    setText('');
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.inputRow, { backgroundColor: colors.bgCard, borderRadius: radius.md, margin: 16 }]}>
        <Ionicons name="cart-outline" size={20} color={colors.textMuted} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="買うものを追加"
          placeholderTextColor={colors.textMuted}
          style={{ flex: 1, color: colors.text, fontSize: 16 }}
          onSubmitEditing={submit}
          returnKeyType="done"
        />
        <Pressable onPress={submit} hitSlop={8}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 40 }}>
        {shoppingItems.length === 0 ? (
          <EmptyState icon="cart-outline" message="家族で共有する買い物リストです" />
        ) : (
          <>
            {left.map((i) => (
              <Row key={i.id} name={i.name} done={false} onToggle={() => { haptic.selection(); toggleShopping(i.id); }} onDelete={() => removeShopping(i.id)} />
            ))}
            {done.length > 0 && (
              <View style={styles.doneHeader}>
                <AppText variant="footnote" muted>
                  購入済み {done.length}
                </AppText>
                <Pressable onPress={clearDoneShopping} hitSlop={8}>
                  <AppText variant="footnote" color={colors.primary}>
                    まとめて削除
                  </AppText>
                </Pressable>
              </View>
            )}
            {done.map((i) => (
              <Row key={i.id} name={i.name} done onToggle={() => { haptic.selection(); toggleShopping(i.id); }} onDelete={() => removeShopping(i.id)} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  name,
  done,
  onToggle,
  onDelete,
}: {
  name: string;
  done: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.bgCard, borderRadius: radius.md }]}>
      <Pressable onPress={onToggle} hitSlop={8}>
        <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={done ? colors.secondary : colors.textMuted} />
      </Pressable>
      <AppText variant="body" style={{ flex: 1, textDecorationLine: done ? 'line-through' : 'none' }} muted={done}>
        {name}
      </AppText>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Ionicons name="close" size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  doneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 },
});
