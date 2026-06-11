import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { useFamilyStore } from '@/store/useFamilyStore';
import { useTheme } from '@/theme/ThemeContext';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'people-circle' as const,
    title: '家族みんなで\n子育てをチームに',
    body: 'パパ・ママ・祖父母。家族全員で予定もタスクも、ひとつに。',
  },
  {
    icon: 'calendar' as const,
    title: '予定もタスクも\nひと目でわかる',
    body: 'カレンダー、やること、買い物、家計。家族の段取りをまとめて共有。',
  },
  {
    icon: 'sparkles' as const,
    title: 'Hokuが\nそっとお手伝い',
    body: '「明日の予定教えて」「牛乳買っといて」。話しかけるだけ。',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { colors } = useTheme();
  const { completeOnboarding } = useAuthStore();
  const setProfile = useFamilyStore((s) => s.setProfile);
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [name, setName] = useState('');

  const isLast = page === SLIDES.length;

  function next() {
    if (page < SLIDES.length) {
      scrollRef.current?.scrollTo({ x: width * (page + 1), animated: true });
      setPage(page + 1);
    }
  }

  async function finish() {
    if (name.trim()) setProfile({ name: name.trim() });
    await completeOnboarding();
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}>
        {SLIDES.map((s) => (
          <View key={s.title} style={[styles.slide, { width }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name={s.icon} size={72} color={colors.primary} />
            </View>
            <AppText variant="largeTitle" style={{ textAlign: 'center' }}>
              {s.title}
            </AppText>
            <AppText variant="body" muted style={{ textAlign: 'center', paddingHorizontal: 24 }}>
              {s.body}
            </AppText>
          </View>
        ))}
        {/* Final: name entry */}
        <View style={[styles.slide, { width }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondaryLight }]}>
            <Ionicons name="happy" size={72} color={colors.secondaryDark} />
          </View>
          <AppText variant="title" style={{ textAlign: 'center' }}>
            お名前を教えてください
          </AppText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="ニックネーム"
            placeholderTextColor={colors.textMuted}
            style={[styles.nameInput, { color: colors.text, backgroundColor: colors.bgCard }]}
          />
        </View>
      </ScrollView>

      <View style={styles.dots}>
        {[...SLIDES, null].map((_, i) => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: i === page ? colors.primary : colors.border }]}
          />
        ))}
      </View>

      <View style={{ padding: 24 }}>
        <Button title={isLast ? 'はじめる' : '次へ'} onPress={isLast ? finish : next} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  slide: { alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: 16 },
  iconWrap: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  nameInput: { width: '78%', padding: 16, borderRadius: 16, fontSize: 18, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
