/**
 * App preferences (device-local, not family-shared).
 * Theme mode, notification toggles, and one-time flags.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '@/lib/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

interface PrefsState {
  hydrated: boolean;
  themeMode: ThemeMode;
  remindersEnabled: boolean;
  demoSeeded: boolean;

  setThemeMode: (m: ThemeMode) => void;
  setRemindersEnabled: (v: boolean) => void;
  markDemoSeeded: () => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      hydrated: false,
      themeMode: 'system',
      remindersEnabled: false,
      demoSeeded: false,

      setThemeMode: (themeMode) => set({ themeMode }),
      setRemindersEnabled: (remindersEnabled) => set({ remindersEnabled }),
      markDemoSeeded: () => set({ demoSeeded: true }),
    }),
    {
      name: 'prefs',
      storage: createJSONStorage(() => asyncStorageAdapter),
      onRehydrateStorage: () => () => {
        usePrefsStore.setState({ hydrated: true });
      },
      partialize: ({ hydrated: _h, ...rest }) => rest,
    },
  ),
);
