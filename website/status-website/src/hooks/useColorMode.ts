import { useCallback, useState } from 'react';

export type ColorMode = 'light' | 'dark';

const STORAGE_KEY = 'status_color_mode';

function initialMode(): ColorMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* storage unavailable (private mode) — fall through to system preference */
  }
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** prefers-color-scheme default with a persisted manual light/dark toggle. */
export function useColorMode(): { mode: ColorMode; toggleMode: () => void } {
  const [mode, setMode] = useState<ColorMode>(initialMode);
  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next: ColorMode = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* storage unavailable — the toggle still works for this session */
      }
      return next;
    });
  }, []);
  return { mode, toggleMode };
}
