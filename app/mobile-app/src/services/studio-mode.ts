import { getItem, setItem } from '@/services/secure-storage';
import type { StudioMode } from '@/utils/studio-mode';

const KEY = 'duncit.studio_mode';
const VALID = new Set<StudioMode>(['USER', 'HOST', 'VENUE', 'ECOMM']);

/** Read the persisted studio mode, or null when none/invalid. */
export async function getStudioMode(): Promise<StudioMode | null> {
  const value = await getItem(KEY);
  return value && VALID.has(value as StudioMode) ? (value as StudioMode) : null;
}

export async function setStudioMode(mode: StudioMode): Promise<void> {
  await setItem(KEY, mode);
}
