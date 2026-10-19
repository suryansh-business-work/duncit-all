import { storeLog } from './log';

/** What the shopper picked for light/dark; `system` follows the device. */
export type ColorPreference = 'light' | 'dark' | 'system';

/** The text sizes the preferences panel offers, as a multiple of the default. */
export const TEXT_SCALES = [1, 1.125, 1.25] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

/** Every display choice the preferences sidebar keeps for this browser. */
export interface StorePreferences {
  color: ColorPreference;
  textScale: TextScale;
  underlineLinks: boolean;
  reduceMotion: boolean;
  readableFont: boolean;
  /** Off: an occasion's colours stay, its animation never plays. */
  festiveEffects: boolean;
}

export const DEFAULT_PREFERENCES: StorePreferences = {
  color: 'system',
  textScale: 1,
  underlineLinks: false,
  reduceMotion: false,
  readableFont: false,
  festiveEffects: true,
};

const STORAGE_KEY = 'ecomm_preferences';
/** The single light/dark key the store used before the preferences panel. */
const LEGACY_COLOR_KEY = 'ecomm_color_mode';

const isColor = (value: unknown): value is ColorPreference => value === 'light' || value === 'dark' || value === 'system';
const isScale = (value: unknown): value is TextScale => TEXT_SCALES.includes(value as TextScale);
const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);

/** Keep only well-formed values; anything else falls back to the default. */
function sanitise(raw: Partial<Record<keyof StorePreferences, unknown>>): StorePreferences {
  const d = DEFAULT_PREFERENCES;
  return {
    color: isColor(raw.color) ? raw.color : d.color,
    textScale: isScale(raw.textScale) ? raw.textScale : d.textScale,
    underlineLinks: bool(raw.underlineLinks, d.underlineLinks),
    reduceMotion: bool(raw.reduceMotion, d.reduceMotion),
    readableFont: bool(raw.readableFont, d.readableFont),
    festiveEffects: bool(raw.festiveEffects, d.festiveEffects),
  };
}

/** The saved choices, else the defaults (a blocked or empty storage is not an error worth showing). */
export function readPreferences(): StorePreferences {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (saved) return sanitise(JSON.parse(saved) as Record<string, unknown>);
    const legacy = globalThis.localStorage?.getItem(LEGACY_COLOR_KEY);
    return sanitise({ color: legacy ?? undefined });
  } catch (error) {
    storeLog.warn('preferences', 'read', { error });
    return DEFAULT_PREFERENCES;
  }
}

/** Persisting is a convenience: a blocked storage only means the choices last this visit. */
export function savePreferences(prefs: StorePreferences): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    storeLog.warn('preferences', 'save', { error });
  }
}
