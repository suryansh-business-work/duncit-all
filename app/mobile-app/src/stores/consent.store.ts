import { create } from 'zustand';
import { parseConsent, serializeConsent, type ConsentChoice } from '@duncit/utils';
import { logs } from '@duncit/logs';

import { getItem, removeItem, setItem } from '@/services/secure-storage';
import { SHORT_LINK_CLICK_KEY } from '@/services/short-link-click-key';

const KEY = 'duncit.consent';

interface ConsentState {
  /** This device's tracking choice; null until answered (or once it expires). */
  choice: ConsentChoice | null;
  /** False until the stored choice has been read on launch. */
  hydrated: boolean;
  /** Read the stored choice. Idempotent: every caller awaits the same read. */
  hydrate: () => Promise<void>;
  /** Save a new choice and delete what a withdrawn category kept here. */
  setChoice: (choice: ConsentChoice) => void;
}

const logFailure = (fn: string) => (error: unknown) => {
  logs.mobileApp.error('consent.store', fn, { error });
};

/** The one launch read, shared by App and the attribution capture. */
let hydration: Promise<void> | null = null;

/**
 * Tracking consent on the native app — the twin of mWeb's shared cookie
 * (@duncit/utils consent.ts). The same serialised choice lives in secure
 * storage. "Undecided" and "declined" behave identically: nothing optional
 * runs; the only difference is that an undecided device is shown the sheet.
 */
export const useConsentStore = create<ConsentState>((set) => ({
  choice: null,
  hydrated: false,
  hydrate: () => {
    hydration ??= getItem(KEY)
      // An unreadable keystore is an unanswered question, not a crash.
      .catch((error: unknown) => {
        logFailure('hydrate')(error);
        return null;
      })
      .then((raw) => set({ choice: parseConsent(raw), hydrated: true }));
    return hydration;
  },
  setChoice: (choice) => {
    set({ choice });
    setItem(KEY, serializeConsent(choice)).catch(logFailure('setChoice'));
    // The click id is attribution — kept only while marketing is allowed.
    if (!choice.marketing) removeItem(SHORT_LINK_CLICK_KEY).catch(logFailure('setChoice'));
  },
}));
