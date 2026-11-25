import { create } from 'zustand';
import { CrmTelephony } from 'crm-telephony';

import { readValue, STORAGE_KEYS, writeValue } from '@/services/secure-storage';

/** The call features a person can switch on or off in Settings. */
export interface Features {
  /** The caller ID card when a CRM contact calls. */
  callerId: boolean;
  /** Calls with CRM contacts saved to the lead's communication log (+ the post-call screen). */
  autoLog: boolean;
  /** The phone's own recording attached to each logged call. */
  recordings: boolean;
}

export const DEFAULT_FEATURES: Features = { callerId: true, autoLog: true, recordings: true };

interface FeaturesState extends Features {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  set: (patch: Partial<Features>) => Promise<void>;
}

/** Parse what was stored, falling back to the defaults for anything missing or broken. */
export function parseFeatures(raw: string | null): Features {
  if (!raw) return DEFAULT_FEATURES;
  try {
    const value = JSON.parse(raw) as Partial<Features>;
    return {
      callerId: typeof value.callerId === 'boolean' ? value.callerId : DEFAULT_FEATURES.callerId,
      autoLog: typeof value.autoLog === 'boolean' ? value.autoLog : DEFAULT_FEATURES.autoLog,
      recordings:
        typeof value.recordings === 'boolean' ? value.recordings : DEFAULT_FEATURES.recordings,
    };
  } catch {
    return DEFAULT_FEATURES;
  }
}

/** The Android side reads its two switches from its own preferences, so every change is pushed to it. */
const pushToPhone = (f: Features) => CrmTelephony?.setFeatures(f.callerId, f.autoLog);

export const useFeaturesStore = create<FeaturesState>((set, get) => ({
  ...DEFAULT_FEATURES,
  hydrated: false,
  hydrate: async () => {
    const features = parseFeatures(await readValue(STORAGE_KEYS.features));
    pushToPhone(features);
    set({ ...features, hydrated: true });
  },
  set: async (patch) => {
    const { callerId, autoLog, recordings } = { ...get(), ...patch };
    const next = { callerId, autoLog, recordings };
    // Logging starts from the moment it is switched on — calls from before are never uploaded.
    if (patch.autoLog === true && !get().autoLog)
      await writeValue(STORAGE_KEYS.callCheckpoint, String(Date.now()));
    await writeValue(STORAGE_KEYS.features, JSON.stringify(next));
    pushToPhone(next);
    set(next);
  },
}));
