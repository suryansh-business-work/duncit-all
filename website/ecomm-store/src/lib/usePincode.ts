import { useCallback, useSyncExternalStore } from 'react';

import { STORAGE_KEYS, readStored, writeStored } from './storage';

/**
 * The shopper's delivery pincode, kept in the browser and shared by every
 * component that reads it (the "Deliver to" pill, the product page's delivery
 * check, checkout's address form) — one change updates them all.
 */
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const snapshot = () => readStored(STORAGE_KEYS.pincode) ?? '';

export function usePincode(): [string, (next: string) => void] {
  const pincode = useSyncExternalStore(subscribe, snapshot, () => '');
  const setPincode = useCallback((next: string) => {
    writeStored(STORAGE_KEYS.pincode, next);
    listeners.forEach((listener) => listener());
  }, []);
  return [pincode, setPincode];
}
