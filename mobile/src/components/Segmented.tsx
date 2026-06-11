import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors, radius, shadow } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.bgMuted, borderRadius: radius.sm }]}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              styles.seg,
              { borderRadius: radius.sm - 2 },
              active && { backgroundColor: colors.bgCard, ...shadow.sm },
            ]}>
            <AppText variant="subhead" color={active ? colors.text : colors.textMuted}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 3, gap: 3 },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
});
