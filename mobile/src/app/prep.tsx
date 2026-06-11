import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Card, EmptyState } from '@/components/ui';
import { useConfirm } from '@/components/ConfirmProvider';
import { haptic } from '@/lib/haptics';
import { useFamilyStore } from '@/store/useFamilyStore';
import { useTheme } from '@/theme/ThemeContext';

export default function PrepScreen() {
  const { colors, radius } = useTheme();
  const confirm = useConfirm();
  const { prep, addPrep, togglePrep, removePrep, resetRoutinePrep } = useFamilyStore();
  const [text, setText] = useState('');
  const [routine, setRoutine] = useState(false);

  function submit() {
    if (!text.trim()) return;
    addPrep({ name: text.trim(), routine });
    haptic.light();
    setText('');
  }

  const routineItems = prep.filter((p) => p.routine);
  const oneOff = prep.filter((p) => !p.routine);

  async function reset() {
    if (await confirm({ title: '持ち物をリセット', message: '毎日の持ち物のチェックを未完了に戻します。', confirmLabel: 'リセット' })) {
      resetRoutinePrep();
      haptic.success();
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <View style={[styles.inputRow, { backgroundColor: colors.bgCard, borderRadius: radius.md }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="持ち物・準備するものを追加"
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, color: colors.text, fontSize: 16 }}
            onSubmitEditing={submit}
            returnKeyType="done"
          />
          <Pressable onPress={submit} hitSlop={8}>
            <Ionicons name="add-circle" size={28} color={colors.primary} />
          </Pressable>
        </View>
        <Pressable onPress={() => setRoutine((v) => !v)} style={styles.routineToggle}>
          <Ionicons name={routine ? 'checkbox' : 'square-outline'} size={20} color={routine ? colors.primary : colors.textMuted} />
          <AppText variant="footnote" muted>
            毎日の持ち物として登録（リセットで再利用）
          </AppText>
        </Pressable>

        {prep.length === 0 ? (
          <EmptyState icon="bag-handle-outline" message="園・学校の持ち物や準備をリスト化しましょう" />
        ) : (
          <>
            {routineItems.length > 0 && (
              <Card style={{ gap: 4, padding: 8 }}>
                <View style={styles.sectionHead}>
                  <AppText variant="footnote" muted style={{ paddingHorizontal: 8 }}>
                    毎日の持ち物
                  </AppText>
                  <Pressable onPress={reset} hitSlop={8}>
                    <AppText variant="footnote" color={colors.primary}>
                      リセット
                    </AppText>
                  </Pressable>
                </View>
                {routineItems.map((p) => (
                  <Row key={p.id} name={p.name} done={p.done} onToggle={() => { togglePrep(p.id); haptic.selection(); }} onDelete={() => removePrep(p.id)} />
                ))}
              </Card>
            )}
            {oneOff.length > 0 && (
              <Card style={{ gap: 4, padding: 8 }}>
                <AppText variant="footnote" muted style={{ paddingHorizontal: 8, paddingTop: 4 }}>
                  単発の準備
                </AppText>
                {oneOff.map((p) => (
                  <Row key={p.id} name={p.name} done={p.done} onToggle={() => { togglePrep(p.id); haptic.selection(); }} onDelete={() => removePrep(p.id)} />
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ name, done, onToggle, onDelete }: { name: string; done: boolean; onToggle: () => void; onDelete: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Pressable onPress={onToggle} hitSlop={8}>
        <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={done ? colors.secondary : colors.textMuted} />
      </Pressable>
      <AppText variant="body" style={{ flex: 1, textDecorationLine: done ? 'line-through' : 'none' }} muted={done}>
        {name}
      </AppText>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  routineToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
});
