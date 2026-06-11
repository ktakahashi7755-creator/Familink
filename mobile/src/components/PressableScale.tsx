import { type ReactNode } from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Pressable that gently scales down on press (Apple-style tactile feedback). */
export function PressableScale({
  children,
  style,
  scaleTo = 0.96,
  ...rest
}: PressableProps & { children: ReactNode; style?: ViewStyle; scaleTo?: number }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        // Reanimated shared values are intentionally mutable from JS.
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(scaleTo, { duration: 90 });
      }}
      onPressOut={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(1, { duration: 130 });
      }}
      style={[style, animatedStyle]}
      {...rest}>
      {children}
    </AnimatedPressable>
  );
}
