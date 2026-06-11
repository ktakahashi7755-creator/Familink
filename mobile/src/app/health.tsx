import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Card, EmptyState } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { formatDateJa, todayISO } from '@/lib/utils';
import { useFamilyStore } from '@/store/useFamilyStore';
import { useTheme } from '@/theme/ThemeContext';

export default function HealthScreen() {
  const { colors, radius } = useTheme();
  const { health, members, addHealth, removeHealth } = useFamilyStore();

  const [memberId, setMemberId] = useState<string | undefined>(undefined);
  const [temp, setTemp] = useState('');
  const [symptom, setSymptom] = useState('');
  const [medication, setMedication] = useState('');

  function save() {
    if (!temp && !symptom.trim()) return;
    addHealth({
      date: todayISO(),
      memberId,
      temperature: temp ? parseFloat(temp) : undefined,
      symptom: symptom.trim() || undefined,
      medication: medication.trim() || undefined,
    });
    haptic.success();
    setTemp('');
    setSymptom('');
    setMedication('');
  }

  const memberName = (id?: string) => members.find((m) => m.id === id)?.name ?? '本人';

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Card>
          <AppText variant="footnote" muted style={{ marginBottom: 8 }}>
            今日の体調を記録
          </AppText>
          {members.length > 0 && (
            <View style={styles.chipRow}>
              {members.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setMemberId(memberId === m.id ? undefined : m.id)}
                  style={[styles.chip, { backgroundColor: memberId === m.id ? m.color : colors.bgMuted, borderRadius: radius.full }]}>
                  <AppText variant="footnote" color={memberId === m.id ? '#fff' : colors.text}>
                    {m.name}
                  </AppText>
                </Pressable>
              ))}
            </View>
          )}
          <TextInput
            value={temp}
            onChangeText={setTemp}
            placeholder="体温 (例 37.2)"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={[styles.input, { color: colors.text, backgroundColor: colors.bgInset, borderRadius: radius.sm }]}
          />
          <TextInput
            value={symptom}
            onChangeText={setSymptom}
            placeholder="症状・様子 (例 咳・鼻水)"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.bgInset, borderRadius: radius.sm }]}
          />
          <TextInput
            value={medication}
            onChangeText={setMedication}
            placeholder="お薬 (任意)"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.bgInset, borderRadius: radius.sm }]}
          />
          <Button title="記録する" icon="add" onPress={save} style={{ marginTop: 4 }} />
        </Card>

        <AppText variant="caption" muted style={{ textAlign: 'center' }}>
          ※ 記録の補助です。診断ではありません。心配な症状は受診や #7119 にご相談ください。
        </AppText>

        {health.length === 0 ? (
          <EmptyState icon="thermometer-outline" message="体調記録はまだありません" />
        ) : (
          health.map((h) => (
            <View key={h.id} style={[styles.record, { backgroundColor: colors.bgCard, borderRadius: radius.md }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="body">
                  {memberName(h.memberId)}
                  {h.temperature ? ` ・ ${h.temperature}℃` : ''}
                </AppText>
                {h.symptom && (
                  <AppText variant="footnote" muted>
                    {h.symptom}
                    {h.medication ? ` / 薬: ${h.medication}` : ''}
                  </AppText>
                )}
                <AppText variant="caption" muted>
                  {formatDateJa(h.date)}
                </AppText>
              </View>
              <Pressable onPress={() => removeHealth(h.id)} hitSlop={8}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
  input: { padding: 12, fontSize: 16, marginBottom: 8 },
  record: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
});
