import * as SecureStore from 'expo-secure-store';

/**
 * Small values the app keeps between launches, in the Android Keystore-backed
 * secure store: the session token, the install id and the sync checkpoints.
 */
export const STORAGE_KEYS = {
  token: 'duncit_crm_token',
  installId: 'duncit_crm_install_id',
  callCheckpoint: 'duncit_crm_call_checkpoint',
  directorySyncedAt: 'duncit_crm_directory_synced_at',
  features: 'duncit_crm_features',
  locale: 'duncit_crm_locale',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export const readValue = (key: StorageKey): Promise<string | null> => SecureStore.getItemAsync(key);

export const writeValue = (key: StorageKey, value: string): Promise<void> =>
  SecureStore.setItemAsync(key, value);

export const removeValue = (key: StorageKey): Promise<void> => SecureStore.deleteItemAsync(key);

/** Everything the app stored, gone — sign-out leaves nothing of the CRM behind. */
export async function clearAllValues(): Promise<void> {
  await Promise.all(Object.values(STORAGE_KEYS).map((key) => SecureStore.deleteItemAsync(key)));
}
