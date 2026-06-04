import { getItem, setItem } from '@/services/secure-storage';

export type ThemePref = 'light' | 'dark';

const KEY = 'duncit.theme';

/** Read the persisted light/dark preference, or null to follow the device. */
export async function getThemePref(): Promise<ThemePref | null> {
  const value = await getItem(KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

export async function setThemePref(value: ThemePref): Promise<void> {
  await setItem(KEY, value);
}
