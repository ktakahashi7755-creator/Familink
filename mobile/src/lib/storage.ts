/**
 * AsyncStorage persistence helper.
 * ------------------------------------------------------------------
 * The web MVP persisted everything under a single `familink_v3` key.
 * On mobile we namespace per-slice keys under `familink_v3:<slice>` so
 * each Zustand store can load/save independently (smaller writes, no
 * giant single-blob churn). The version prefix lets us migrate later.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const ROOT = 'familink_v3';

export function storageKey(slice: string): string {
  return `${ROOT}:${slice}`;
}

export async function loadJSON<T>(slice: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(slice));
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`[storage] load ${slice} failed`, e);
    return fallback;
  }
}

export async function saveJSON<T>(slice: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(slice), JSON.stringify(value));
  } catch (e) {
    // Mirror the web app's behavior: never silently swallow quota errors.
    console.warn(`[storage] save ${slice} failed`, e);
  }
}

export async function removeSlice(slice: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(slice));
  } catch (e) {
    console.warn(`[storage] remove ${slice} failed`, e);
  }
}

/** A tiny zustand persist middleware tuned for our slice keys. */
export const asyncStorageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    return AsyncStorage.getItem(storageKey(name));
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(storageKey(name), value);
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(storageKey(name));
  },
};
