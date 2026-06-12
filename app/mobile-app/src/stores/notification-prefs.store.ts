import { create } from 'zustand';

import { getItem, setItem } from '@/services/secure-storage';

const KEY = 'duncit_notifications_enabled';

interface NotificationPrefsState {
  /** Master switch for device notifications (B4-13); defaults to on. */
  enabled: boolean;
  hydrate: () => Promise<void>;
  setEnabled: (next: boolean) => void;
}

/** Persisted allow/deny preference gating Notifee device notifications. */
export const useNotificationPrefsStore = create<NotificationPrefsState>((set) => ({
  enabled: true,
  hydrate: async () => {
    const stored = await getItem(KEY);
    if (stored !== null) set({ enabled: stored !== 'off' });
  },
  setEnabled: (next) => {
    set({ enabled: next });
    setItem(KEY, next ? 'on' : 'off').catch(() => undefined);
  },
}));
