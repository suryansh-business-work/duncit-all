import type { useTranslation } from '@duncit/app-settings';
import { NONE_KEY, SLICE_COPY } from './slice-copy';
import type { AnalyticsBreakdown } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];
type Slice = AnalyticsBreakdown['slices'][number];

export interface SliceLabelContext {
  t: Translate;
  /** Formats `HH:mm` in the admin's time pattern (`useDateFormat().formatClock`). */
  formatClock: (value: string) => string;
  /** The reader's language — locale slices are named in it. */
  locale: string;
}

/** A locale code (`hi-IN`) named in the reader's own language, or the code if it is not one. */
function languageName(code: string, locale: string): string {
  try {
    // The default `fallback: 'code'` hands back the code itself for a tag it cannot name.
    return new Intl.DisplayNames([locale], { type: 'language' }).of(code) as string;
  } catch {
    // Intl rejects a malformed tag; the stored code is still the honest label.
    return code;
  }
}

/**
 * A slice's words, in order of preference: the name the data carries (a city,
 * a category, a screen), "not set", a start time, a language, or the bundle's
 * label for the key.
 */
export function sliceLabel(breakdownKey: string, slice: Slice, context: SliceLabelContext): string {
  if (slice.label) return slice.label;
  if (slice.key === 'none') return context.t(NONE_KEY);
  if (breakdownKey === 'hour_of_day' || breakdownKey === 'store_order_hour') return context.formatClock(`${slice.key.padStart(2, '0')}:00`);
  if (breakdownKey === 'user_language') return languageName(slice.key, context.locale);
  const key = SLICE_COPY[breakdownKey]?.[slice.key];
  return key ? context.t(key) : slice.key;
}
