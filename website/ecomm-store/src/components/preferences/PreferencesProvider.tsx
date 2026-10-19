import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { PreferencesDrawer } from './PreferencesDrawer';

interface PreferencesDrawerValue {
  /** Open the display & accessibility sidebar. */
  openPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesDrawerValue>({ openPreferences: () => undefined });

/**
 * One preferences sidebar for the whole store: the header, the phone menu and
 * the footer all open this same drawer.
 */
export function PreferencesProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [open, setOpen] = useState(false);
  /** Off when a control hands focus elsewhere on close (the cookie banner). */
  const [restoreFocus, setRestoreFocus] = useState(true);
  const openPreferences = useCallback(() => {
    setRestoreFocus(true);
    setOpen(true);
  }, []);
  const close = useCallback((restore: boolean) => {
    setRestoreFocus(restore);
    setOpen(false);
  }, []);
  const value = useMemo(() => ({ openPreferences }), [openPreferences]);
  return (
    <PreferencesContext.Provider value={value}>
      {children}
      <PreferencesDrawer open={open} restoreFocus={restoreFocus} onClose={close} />
    </PreferencesContext.Provider>
  );
}

export const usePreferencesDrawer = () => useContext(PreferencesContext);
