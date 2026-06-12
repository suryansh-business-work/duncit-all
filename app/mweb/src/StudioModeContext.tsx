import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { StudioMode } from './studio-mode';

interface StudioModeContextValue {
  mode: StudioMode;
  setMode: (mode: StudioMode) => void;
}

const StudioModeContext = createContext<StudioModeContextValue>({
  mode: 'USER',
  setMode: () => undefined,
});

const STORAGE_KEY = 'mweb_studio_mode';
const VALID = new Set<StudioMode>(['USER', 'HOST', 'VENUE', 'ECOMM']);

export function StudioModeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [mode, setModeState] = useState<StudioMode>(() => {
    if (typeof window === 'undefined') return 'USER';
    const saved = localStorage.getItem(STORAGE_KEY) as StudioMode | null;
    return saved && VALID.has(saved) ? saved : 'USER';
  });

  const value = useMemo<StudioModeContextValue>(
    () => ({
      mode,
      setMode: (next) => {
        localStorage.setItem(STORAGE_KEY, next);
        setModeState(next);
      },
    }),
    [mode]
  );

  return <StudioModeContext.Provider value={value}>{children}</StudioModeContext.Provider>;
}

export const useStudioMode = () => useContext(StudioModeContext);
