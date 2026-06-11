import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeContext';

/**
 * Hoku — a gentle, breathing presence (not a flashy mascot). A soft scale
 * loop conveys "alive and ready to help" while staying calm and trustworthy.
 */
export function HokuAvatar({ size = 40, active = true }: { size?: number; active?: boolean }) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!active) return;
    scale.value = withRepeat(
      withTiming(1.06, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [active, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primaryLight,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      <Ionicons name="sparkles" size={size * 0.5} color={colors.primary} />
    </Animated.View>
  );
}
