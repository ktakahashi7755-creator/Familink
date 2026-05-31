import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const ok = Platform.OS !== 'web';

export const haptic = {
  light: (): void => { if (ok) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); },
  medium: (): void => { if (ok) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); },
  heavy: (): void => { if (ok) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); },
  success: (): void => { if (ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
  warning: (): void => { if (ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); },
  error: (): void => { if (ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); },
  selection: (): void => { if (ok) Haptics.selectionAsync(); },
};
