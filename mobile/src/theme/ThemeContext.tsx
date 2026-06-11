import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkTheme, lightTheme, radius, shadow, spacing, typography, type ThemeColors } from './tokens';

interface ThemeValue {
  colors: ThemeColors;
  isDark: boolean;
  radius: typeof radius;
  spacing: typeof spacing;
  shadow: typeof shadow;
  typography: typeof typography;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const value = useMemo<ThemeValue>(
    () => ({
      colors: isDark ? darkTheme : lightTheme,
      isDark,
      radius,
      spacing,
      shadow,
      typography,
    }),
    [isDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return ctx;
}
