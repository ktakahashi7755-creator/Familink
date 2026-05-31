import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useStore } from '../src/store';
import { Colors, Typography, Spacing, Radius, Shadows } from '../src/constants/theme';
import { Sheet } from '../src/components/ui/Sheet';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { formatYen, numberWithCommas } from '../src/utils/text';
import { haptic } from '../src/utils/haptics';

type TxType = 'income' | 'expense';

const CATEGORIES = [
  { id: 'food', label: '食費', color: '#FF6B6B' },
  { id: 'transport', label: '交通費', color: '#5B7FFF' },
  { id: 'entertainment', label: '娯楽', color: '#FFAB40' },
  { id: 'medical', label: '医療', color: '#4CC9A0' },
  { id: 'education', label: '教育', color: '#AB69D8' },
  { id: 'shopping', label: '日用品', color: '#26C6DA' },
  { id: 'utilities', label: '光熱費', color: '#78909C' },
  { id: 'other', label: 'その他', color: '#8E8E93' },
];

export default function BudgetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const txs = useStore(s => s.txs);
  const addTx = useStore(s => s.addTx);
  const deleteTx = useStore(s => s.deleteTx);
  const isPremium = useStore(s => s.isPremiumUser);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showAdd, setShowAdd] = useState(false);
  const [txType, setTxType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [note, setNote] = useState('');

  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const monthTxs = useMemo(
    () => txs.filter(t => t.date.startsWith(monthKey)).sort((a, b) => b.date.localeCompare(a.date)),
    [txs, monthKey]
  );

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of monthTxs) {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, balance: income - expense };
  }, [monthTxs]);

  const expByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of monthTxs.filter(t => t.type === 'expense')) {
      const cat = t.category ?? 'other';
      map[cat] = (map[cat] ?? 0) + t.amount;
    }
    return map;
  }, [monthTxs]);

  function handleDelete(id: string) {
    haptic.warning();
    Alert.alert('取引を削除', 'この取引を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => { haptic.heavy(); deleteTx(id); } },
    ]);
  }

  function handleAdd() {
    const amt = parseInt(amount.replace(/,/g, ''), 10);
    if (!amt || isNaN(amt)) { haptic.error(); return; }
    haptic.success();
    addTx({
      type: txType,
      amount: amt,
      category: txType === 'expense' ? category : 'income',
      note: note || undefined,
      date: `${year}-${String(month).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
    });
    setAmount('');
    setNote('');
    setShowAdd(false);
  }

  if (!isPremium) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
        <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', top: insets.top + 16, left: Spacing.base }}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 48, marginBottom: Spacing.base }}>💰</Text>
        <Text style={{ fontSize: Typography.xl, fontWeight: '700', color: Colors.text, textAlign: 'center' }}>家計管理</Text>
        <Text style={{ fontSize: Typography.base, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl }}>
          プレミアムプランで家計の収支を記録・分析できます
        </Text>
        <Button title="プレミアムを見る" onPress={() => router.push('/premium')} variant="primary" size="lg" fullWidth />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>家計管理</Text>
        <TouchableOpacity onPress={() => { haptic.light(); setShowAdd(true); }}>
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => {
            haptic.selection();
            if (month === 1) { setYear(y => y - 1); setMonth(12); }
            else setMonth(m => m - 1);
          }} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{year}年{month}月</Text>
          <TouchableOpacity onPress={() => {
            haptic.selection();
            if (month === 12) { setYear(y => y + 1); setMonth(1); }
            else setMonth(m => m + 1);
          }} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { flex: 1 }]}>
            <Text style={styles.summaryLabel}>収入</Text>
            <Text style={[styles.summaryAmount, { color: Colors.success }]}>
              {formatYen(totals.income)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1 }]}>
            <Text style={styles.summaryLabel}>支出</Text>
            <Text style={[styles.summaryAmount, { color: Colors.error }]}>
              {formatYen(totals.expense)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1 }]}>
            <Text style={styles.summaryLabel}>収支</Text>
            <Text style={[styles.summaryAmount, { color: totals.balance >= 0 ? Colors.success : Colors.error }]}>
              {totals.balance >= 0 ? '+' : ''}{formatYen(totals.balance)}
            </Text>
          </View>
        </View>

        {/* Category breakdown */}
        {Object.keys(expByCategory).length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify().damping(18)} style={styles.section}>
            <Text style={styles.sectionTitle}>カテゴリ別支出</Text>
            <View style={styles.categoryList}>
              {CATEGORIES
                .filter(c => expByCategory[c.id])
                .sort((a, b) => (expByCategory[b.id] ?? 0) - (expByCategory[a.id] ?? 0))
                .map(cat => {
                  const amt = expByCategory[cat.id] ?? 0;
                  const pct = totals.expense > 0 ? (amt / totals.expense) * 100 : 0;
                  return (
                    <View key={cat.id} style={styles.categoryRow}>
                      <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                      <Text style={styles.catLabel}>{cat.label}</Text>
                      <View style={styles.catBar}>
                        <View style={[styles.catBarFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                      </View>
                      <Text style={styles.catAmount}>{formatYen(amt)}</Text>
                    </View>
                  );
                })
              }
            </View>
          </Animated.View>
        )}

        {/* Transaction list */}
        <Animated.View entering={FadeInDown.delay(150).springify().damping(18)} style={styles.section}>
          <Text style={styles.sectionTitle}>取引履歴</Text>
          {monthTxs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>取引記録がありません</Text>
            </View>
          ) : (
            <View style={styles.txList}>
              {monthTxs.map(tx => {
                const cat = CATEGORIES.find(c => c.id === tx.category);
                return (
                  <TouchableOpacity
                    key={tx.id}
                    style={styles.txRow}
                    onLongPress={() => handleDelete(tx.id)}
                  >
                    <View style={[styles.txIcon, { backgroundColor: (cat?.color ?? Colors.success) + '20' }]}>
                      <Text style={{ fontSize: 16 }}>
                        {tx.type === 'income' ? '💹' : cat ? '💸' : '💸'}
                      </Text>
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txNote}>{tx.note ?? cat?.label ?? (tx.type === 'income' ? '収入' : '支出')}</Text>
                      <Text style={styles.txDate}>{tx.date}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: tx.type === 'income' ? Colors.success : Colors.error }]}>
                      {tx.type === 'income' ? '+' : '-'}{formatYen(tx.amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Add sheet */}
      <Sheet visible={showAdd} onClose={() => setShowAdd(false)} title="収支を記録" scrollable>
        <View style={styles.addForm}>
          <View style={styles.typeRow}>
            {(['expense', 'income'] as TxType[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, txType === t && { backgroundColor: t === 'expense' ? Colors.error : Colors.success, borderColor: 'transparent' }]}
                onPress={() => { haptic.selection(); setTxType(t); }}
              >
                <Text style={[styles.typeBtnText, txType === t && { color: '#fff' }]}>
                  {t === 'expense' ? '支出' : '収入'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Input
            label="金額"
            placeholder="0"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            rightElement={<Text style={styles.yen}>円</Text>}
          />
          {txType === 'expense' && (
            <View>
              <Text style={styles.fieldLabel}>カテゴリ</Text>
              <View style={styles.catPicker}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catChip, category === c.id && { backgroundColor: c.color + '20', borderColor: c.color }]}
                    onPress={() => { haptic.selection(); setCategory(c.id); }}
                  >
                    <Text style={[styles.catChipText, category === c.id && { color: c.color, fontWeight: '600' }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <Input
            label="メモ（任意）"
            placeholder="詳細を入力"
            value={note}
            onChangeText={setNote}
          />
          <Button title="記録する" onPress={handleAdd} variant="primary" size="lg" fullWidth />
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
  scroll: { paddingHorizontal: Spacing.base },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  summaryCard: {
    backgroundColor: Colors.card, borderRadius: Radius.xl,
    padding: Spacing.sm, alignItems: 'center', ...Shadows.sm,
  },
  summaryLabel: { fontSize: Typography.xs, color: Colors.textMuted, marginBottom: 4 },
  summaryAmount: { fontSize: Typography.md, fontWeight: '700' },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  categoryList: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Spacing.base, gap: Spacing.sm, ...Shadows.sm },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catLabel: { fontSize: Typography.sm, color: Colors.textSub, width: 50 },
  catBar: { flex: 1, height: 8, backgroundColor: Colors.bgMuted, borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 4 },
  catAmount: { fontSize: Typography.sm, color: Colors.text, width: 70, textAlign: 'right' },
  emptyCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', ...Shadows.sm },
  emptyText: { fontSize: Typography.sm, color: Colors.textMuted },
  txList: { backgroundColor: Colors.card, borderRadius: Radius.xl, overflow: 'hidden', ...Shadows.sm },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight,
  },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txNote: { fontSize: Typography.base, color: Colors.text },
  txDate: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  txAmount: { fontSize: Typography.base, fontWeight: '600' },
  addForm: { gap: Spacing.base, paddingBottom: 20 },
  typeRow: { flexDirection: 'row', gap: Spacing.sm },
  typeBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.borderLight,
    backgroundColor: Colors.bgMuted,
  },
  typeBtnText: { fontSize: Typography.base, fontWeight: '600', color: Colors.textSub },
  yen: { fontSize: Typography.base, color: Colors.textSub },
  fieldLabel: { fontSize: Typography.sm, fontWeight: '500', color: Colors.textSub, marginBottom: 8 },
  catPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderLight,
    backgroundColor: Colors.bgMuted,
  },
  catChipText: { fontSize: Typography.sm, color: Colors.textSub },
});
