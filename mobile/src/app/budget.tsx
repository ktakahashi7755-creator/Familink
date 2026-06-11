import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Card, EmptyState } from '@/components/ui';
import { Segmented } from '@/components/Segmented';
import { formatYen, todayISO } from '@/lib/utils';
import { useFamilyStore } from '@/store/useFamilyStore';
import { useTheme } from '@/theme/ThemeContext';

const CATEGORIES = ['食費', '日用品', '教育', '医療', '交通', '娯楽', 'その他'];

export default function BudgetScreen() {
  const { colors, radius } = useTheme();
  const { txs, addTx, removeTx } = useFamilyStore();
  const [open, setOpen] = useState(false);

  const month = todayISO().slice(0, 7);
  const monthTxs = useMemo(() => txs.filter((t) => t.date.startsWith(month)), [txs, month]);
  const income = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <Card>
          <AppText variant="footnote" muted>
            今月の収支
          </AppText>
          <AppText variant="largeTitle" color={income - expense >= 0 ? colors.secondaryDark : colors.red}>
            {formatYen(income - expense)}
          </AppText>
          <View style={styles.summaryRow}>
            <View>
              <AppText variant="caption" muted>
                収入
              </AppText>
              <AppText variant="headline" color={colors.secondaryDark}>
                {formatYen(income)}
              </AppText>
            </View>
            <View>
              <AppText variant="caption" muted>
                支出
              </AppText>
              <AppText variant="headline" color={colors.red}>
                {formatYen(expense)}
              </AppText>
            </View>
          </View>
        </Card>

        <Button title="記録を追加" icon="add" onPress={() => setOpen(true)} />

        {monthTxs.length === 0 ? (
          <EmptyState icon="wallet-outline" message="今月の家計記録はまだありません" />
        ) : (
          monthTxs.map((t) => (
            <View key={t.id} style={[styles.txRow, { backgroundColor: colors.bgCard, borderRadius: radius.md }]}>
              <View style={[styles.txIcon, { backgroundColor: t.type === 'income' ? colors.secondaryLight : colors.redLight }]}>
                <Ionicons
                  name={t.type === 'income' ? 'arrow-down' : 'arrow-up'}
                  size={18}
                  color={t.type === 'income' ? colors.secondaryDark : colors.red}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="body">{t.category ?? 'その他'}</AppText>
                <AppText variant="caption" muted>
                  {t.date}
                </AppText>
              </View>
              <AppText variant="headline" color={t.type === 'income' ? colors.secondaryDark : colors.text}>
                {t.type === 'income' ? '+' : '-'}
                {formatYen(t.amount)}
              </AppText>
              <Pressable onPress={() => removeTx(t.id)} hitSlop={8} style={{ marginLeft: 8 }}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <AddTxModal visible={open} onClose={() => setOpen(false)} onSave={(t) => { addTx(t); setOpen(false); }} />
    </SafeAreaView>
  );
}

function AddTxModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (t: { type: 'income' | 'expense'; amount: number; category: string; date: string }) => void;
}) {
  const { colors, radius } = useTheme();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);

  function save() {
    const n = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    if (!n) return;
    onSave({ type, amount: n, category, date: todayISO() });
    setAmount('');
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
          <View style={styles.sheetHandle} />
          <AppText variant="title3">記録を追加</AppText>
          <Segmented
            options={[
              { key: 'expense', label: '支出' },
              { key: 'income', label: '収入' },
            ]}
            value={type}
            onChange={setType}
          />
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="金額"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            style={[styles.amountInput, { color: colors.text, backgroundColor: colors.bgCard, borderRadius: radius.md }]}
          />
          <View style={styles.catRow}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[styles.catChip, { backgroundColor: c === category ? colors.primary : colors.bgMuted, borderRadius: radius.full }]}>
                <AppText variant="footnote" color={c === category ? '#fff' : colors.text}>
                  {c}
                </AppText>
              </Pressable>
            ))}
          </View>
          <Button title="保存" onPress={save} />
          <Button title="キャンセル" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', gap: 32, marginTop: 12 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { padding: 20, gap: 14, paddingBottom: 36 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(120,120,128,0.4)' },
  amountInput: { padding: 16, fontSize: 28, fontWeight: '700' },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8 },
});
