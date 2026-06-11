/**
 * Auth + session store.
 * ------------------------------------------------------------------
 * Wraps Supabase auth. The web MVP supported a "local-only" mode (no
 * backend account) plus optional Supabase magic-link sign-in. We keep
 * that duality: `mode` is 'local' until the user signs in.
 */
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import { loadJSON, saveJSON } from '@/lib/storage';

export type AuthMode = 'local' | 'supabase';

interface AuthState {
  session: Session | null;
  mode: AuthMode;
  /** Whether onboarding has been completed (mirrors `onboardCompleted`). */
  onboarded: boolean;
  /** True once we've restored persisted flags + the Supabase session. */
  ready: boolean;

  init: () => Promise<void>;
  signInWithOtp: (email: string) => Promise<{ error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ error?: string }>;
  continueLocal: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  mode: 'local',
  onboarded: false,
  ready: false,

  init: async () => {
    const [onboarded, mode] = await Promise.all([
      loadJSON<boolean>('onboardCompleted', false),
      loadJSON<AuthMode>('authMode', 'local'),
    ]);
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, mode: data.session ? 'supabase' : mode, onboarded, ready: true });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, mode: session ? 'supabase' : get().mode });
    });
  },

  signInWithOtp: async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    return { error: error?.message };
  },

  verifyOtp: async (email, token) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'email',
    });
    if (error) return { error: error.message };
    await saveJSON('authMode', 'supabase');
    set({ session: data.session, mode: 'supabase' });
    return {};
  },

  continueLocal: async () => {
    await saveJSON('authMode', 'local');
    set({ mode: 'local' });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    await saveJSON('authMode', 'local');
    set({ session: null, mode: 'local' });
  },

  completeOnboarding: async () => {
    await saveJSON('onboardCompleted', true);
    set({ onboarded: true });
  },
}));
