import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withDelay,
} from 'react-native-reanimated';
import { Colors, Shadows } from '../../constants/theme';

function Dot({ delay }: { delay: number }) {
  const y = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 280 }),
          withTiming(0, { duration: 280 }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

export function TypingIndicator() {
  return (
    <View style={styles.row}>
      <Text style={styles.emoji}>🌸</Text>
      <View style={styles.bubble}>
        <Dot delay={0} />
        <Dot delay={180} />
        <Dot delay={360} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  emoji: { fontSize: 24, marginBottom: 4 },
  bubble: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.card,
    paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: 18, borderBottomLeftRadius: 4,
    ...Shadows.sm,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.textMuted,
  },
});
