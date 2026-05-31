import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({ id: 'familink_v3' });

export const StorageAdapter = {
  getItem: (key: string): string | null => {
    const value = storage.getString(key);
    return value ?? null;
  },
  setItem: (key: string, value: string): void => {
    storage.set(key, value);
  },
  removeItem: (key: string): void => {
    storage.remove(key);
  },
};

export function persist<T>(key: string, value: T): void {
  try {
    storage.set(key, JSON.stringify(value));
  } catch {
    // Storage full - silent fail
  }
}

export function hydrate<T>(key: string, fallback: T): T {
  try {
    const raw = storage.getString(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
