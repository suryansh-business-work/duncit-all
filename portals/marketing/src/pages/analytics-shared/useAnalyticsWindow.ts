import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { format, isValid, parseISO, subDays } from 'date-fns';

/** The windows a marketer picks with one press; anything else is a custom range. */
export const PRESETS = [7, 30, 90] as const;
export type Preset = (typeof PRESETS)[number];
const DEFAULT_PRESET: Preset = 30;
const DAY = 'yyyy-MM-dd';

export interface AnalyticsInput {
  from: string;
  to: string;
  platforms: string[];
}

const isDay = (value: string | null): value is string => {
  if (!value) return false;
  const day = parseISO(value);
  return isValid(day) && format(day, DAY) === value;
};

/** The last `days` days, today included. */
export const presetRange = (days: number, today: Date) => ({
  from: format(subDays(today, days - 1), DAY),
  to: format(today, DAY),
});

/** The window in the URL — `from`, `to`, `platforms` — or the last 30 days when it holds none. */
export function readWindow(params: URLSearchParams, today: Date): { input: AnalyticsInput; preset: Preset | null } {
  const from = params.get('from');
  const to = params.get('to');
  const platforms = (params.get('platforms') ?? '').split(',').filter(Boolean);
  const range = isDay(from) && isDay(to) && from <= to ? { from, to } : presetRange(DEFAULT_PRESET, today);
  const preset = PRESETS.find((days) => {
    const candidate = presetRange(days, today);
    return candidate.from === range.from && candidate.to === range.to;
  });
  return { input: { ...range, platforms }, preset: preset ?? null };
}

/**
 * The page's window, kept in the URL so a link or a reload opens the same
 * read. Changing it replaces the history entry: stepping through windows is
 * not a trail worth Back-buttoning through.
 */
export function useAnalyticsWindow(today: Date = new Date()) {
  const [params, setParams] = useSearchParams();
  const day = format(today, DAY);
  // Keyed on the day, not the instant: a fresh `new Date()` each render must not re-read the window.
  const { input, preset } = useMemo(() => readWindow(params, parseISO(day)), [params, day]);

  const write = useCallback(
    (next: Partial<AnalyticsInput>) => {
      const merged = { ...input, ...next };
      const query = new URLSearchParams(params);
      query.set('from', merged.from);
      query.set('to', merged.to);
      if (merged.platforms.length > 0) query.set('platforms', merged.platforms.join(','));
      else query.delete('platforms');
      setParams(query, { replace: true });
    },
    [input, params, setParams],
  );

  return {
    input,
    preset,
    choosePreset: (days: Preset) => write(presetRange(days, today)),
    chooseRange: (from: string, to: string) => write({ from, to }),
    choosePlatforms: (platforms: string[]) => write({ platforms }),
  };
}

export type AnalyticsWindowState = ReturnType<typeof useAnalyticsWindow>;
