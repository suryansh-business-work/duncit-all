import { useEffect, useRef } from 'react';
import { useColorScheme } from '@mui/material/styles';
import type { LiteDisplayMode } from '../../../shared/graphql/documents';
import { useLiteSession } from '../../../shared/session';

/** The account's choice in MUI's words. */
export const MUI_MODE: Record<LiteDisplayMode, 'system' | 'light' | 'dark'> = { SYSTEM: 'system', LIGHT: 'light', DARK: 'dark' };

/**
 * A signed-in account's Light / Dark / System choice follows the person to
 * every device: when the account's saved mode loads (or changes), it is
 * applied once. A toggle on this device is saved to the account by
 * Settings → Preferences, so the two never fight.
 */
export function DisplayModeSync() {
  const { me } = useLiteSession();
  const { mode, setMode } = useColorScheme();
  const saved = me?.display_mode;
  const applied = useRef<LiteDisplayMode | null>(null);
  useEffect(() => {
    if (!saved || !mode || applied.current === saved) return;
    applied.current = saved;
    if (MUI_MODE[saved] !== mode) setMode(MUI_MODE[saved]);
  }, [saved, mode, setMode]);
  return null;
}
