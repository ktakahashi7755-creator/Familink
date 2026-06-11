import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { useConfirm } from '@/components/ConfirmProvider';
import { haptic } from '@/lib/haptics';
import { fromISODate, toISODate } from '@/lib/utils';
import { memberColors } from '@/theme/tokens';
import { useFamilyStore } from '@/store/useFamilyStore';
import { useTheme } from '@/theme/ThemeContext';

export default function EventEditScreen() {
  const router = useRouter();
  const confirm = useConfirm();
  const { colors, radius } = useTheme();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();

  const { events, members, addEvent, updateEvent, removeEvent } = useFamilyStore();
  const existing = params.id ? events.find((e) => e.id === params.id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing?.date ?? params.date ?? toISODate(new Date()));
  const [allDay, setAllDay] = useState(existing?.allDay ?? false);
  const [start, setStart] = useState(existing?.start ?? '09:00');
  const [end, setEnd] = useState(existing?.end ?? '10:00');
  const [memberId, setMemberId] = useState<string | undefined>(existing?.memberId);
  const [color, setColor] = useState(existing?.color ?? memberColors[0]);
  const [note, setNote] = useState(existing?.note ?? '');
  const [repeat, setRepeat] = useState<NonNullable<typeof existing>['repeat']>(existing?.repeat ?? 'none');
  const [showDate, setShowDate] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const REPEATS: { key: NonNullable<typeof repeat>; label: string }[] = [
    { key: 'none', label: 'なし' },
    { key: 'daily', label: '毎日' },
    { key: 'weekly', label: '毎週' },
    { key: 'monthly', label: '毎月' },
    { key: 'yearly', label: '毎年' },
  ];

  function save() {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      date,
      allDay,
      start: allDay ? undefined : start,
      end: allDay ? undefined : end,
      memberId,
      color,
      repeat,
      note: note.trim() || undefined,
    };
    if (existing) {
      updateEvent(existing.id, payload);
    } else {
      addEvent(payload);
    }
    haptic.success();
    router.back();
  }

  async function confirmDelete() {
    if (!existing) return;
    const ok = await confirm({ title: 'この予定を削除しますか？', destructive: true, confirmLabel: '削除' });
    if (ok) {
      removeEvent(existing.id);
      router.back();
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.navbar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <AppText variant="body" color={colors.primary}>
            キャンセル
          </AppText>
        </Pressable>
        <AppText variant="headline">{existing ? '予定を編集' : '予定を追加'}</AppText>
        <Pressable onPress={save} hitSlop={12} disabled={!title.trim()}>
          <AppText variant="headline" color={title.trim() ? colors.primary : colors.textMuted}>
            保存
          </AppText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="予定のタイトル"
          placeholderTextColor={colors.textMuted}
          style={[styles.titleInput, { color: colors.text, backgroundColor: colors.bgCard, borderRadius: radius.md }]}
        />

        {/* Date */}
        <Pressable
          onPress={() => setShowDate((v) => !v)}
          style={[styles.row, { backgroundColor: colors.bgCard, borderRadius: radius.md }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.textSub} />
          <AppText variant="body" style={{ flex: 1 }}>
            日付
          </AppText>
          <AppText variant="body" color={colors.primary}>
            {date}
          </AppText>
        </Pressable>
        {showDate && (
          <DateTimePicker
            value={fromISODate(date)}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, d) => {
              if (Platform.OS !== 'ios') setShowDate(false);
              if (d) setDate(toISODate(d));
            }}
          />
        )}

        {/* All-day */}
        <View style={[styles.row, { backgroundColor: colors.bgCard, borderRadius: radius.md }]}>
          <Ionicons name="time-outline" size={20} color={colors.textSub} />
          <AppText variant="body" style={{ flex: 1 }}>
            終日
          </AppText>
          <Switch value={allDay} onValueChange={setAllDay} />
        </View>

        {!allDay && (
          <View style={[styles.timeCard, { backgroundColor: colors.bgCard, borderRadius: radius.md }]}>
            <Pressable onPress={() => { setShowEnd(false); setShowStart((v) => !v); }} style={styles.timeRowItem}>
              <AppText variant="body" style={{ flex: 1 }}>開始</AppText>
              <AppText variant="body" color={colors.primary}>{start}</AppText>
            </Pressable>
            {showStart && (
              <DateTimePicker
                value={timeToDate(start)}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  if (Platform.OS !== 'ios') setShowStart(false);
                  if (d) setStart(fmtTime(d));
                }}
              />
            )}
            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
            <Pressable onPress={() => { setShowStart(false); setShowEnd((v) => !v); }} style={styles.timeRowItem}>
              <AppText variant="body" style={{ flex: 1 }}>終了</AppText>
              <AppText variant="body" color={colors.primary}>{end}</AppText>
            </Pressable>
            {showEnd && (
              <DateTimePicker
                value={timeToDate(end)}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  if (Platform.OS !== 'ios') setShowEnd(false);
                  if (d) setEnd(fmtTime(d));
                }}
              />
            )}
          </View>
        )}

        {/* Member chips */}
        {members.length > 0 && (
          <View style={{ gap: 8 }}>
            <AppText variant="footnote" muted>
              担当
            </AppText>
            <View style={styles.chipRow}>
              {members.map((m) => {
                const active = m.id === memberId;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setMemberId(active ? undefined : m.id)}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? m.color : colors.bgMuted, borderRadius: radius.full },
                    ]}>
                    <AppText variant="footnote" color={active ? '#fff' : colors.text}>
                      {m.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Repeat */}
        <View style={{ gap: 8 }}>
          <AppText variant="footnote" muted>
            繰り返し
          </AppText>
          <View style={styles.chipRow}>
            {REPEATS.map((r) => {
              const active = r.key === repeat;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => setRepeat(r.key)}
                  style={[styles.chip, { backgroundColor: active ? colors.primary : colors.bgMuted, borderRadius: radius.full }]}>
                  <AppText variant="footnote" color={active ? '#fff' : colors.text}>
                    {r.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Color */}
        <View style={{ gap: 8 }}>
          <AppText variant="footnote" muted>
            カラー
          </AppText>
          <View style={styles.chipRow}>
            {memberColors.map((c) => (
              <Pressable key={c} onPress={() => setColor(c)} style={[styles.swatch, { backgroundColor: c }]}>
                {color === c && <Ionicons name="checkmark" size={16} color="#fff" />}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Note */}
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="メモ"
          placeholderTextColor={colors.textMuted}
          multiline
          style={[styles.note, { color: colors.text, backgroundColor: colors.bgCard, borderRadius: radius.md }]}
        />

        {existing && <Button title="この予定を削除" variant="danger" icon="trash" onPress={confirmDelete} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function timeToDate(t: string): Date {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function fmtTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  titleInput: { fontSize: 20, fontWeight: '600', padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  timeCard: { paddingHorizontal: 16 },
  timeRowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  divider: { height: StyleSheet.hairlineWidth },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  note: { padding: 16, minHeight: 90, textAlignVertical: 'top', fontSize: 16 },
});
