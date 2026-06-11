/**
 * Supabase client (React Native).
 * ------------------------------------------------------------------
 * Ported from the web MVP (familink.html ~L6219). Uses the same project
 * URL + publishable (anon) key. Session is persisted in AsyncStorage and
 * auto-refreshed. NEVER place the service_role key here.
 *
 * Config can be overridden at build time via app.json `extra` /
 * EXPO_PUBLIC_ env vars without code changes.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import 'react-native-url-polyfill/auto';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  extra.supabaseUrl ??
  'https://jrmzzizjlkrogrbtzyuz.supabase.co';

/** Publishable / anon key — safe to ship in the client. */
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  extra.supabaseAnonKey ??
  'sb_publishable_jz3KFVHZH7_9Ioz8JWp-Fw_Rc9iovm9';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // React Native has no URL bar; we handle the magic-link/OTP flow manually.
    detectSessionInUrl: false,
  },
});

/** Family realtime channel name, mirroring the web app convention. */
export function familyChannelName(familyId: string): string {
  return `familink_family_${familyId}`;
}
