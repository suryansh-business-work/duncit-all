import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { useColorScheme } from '@mui/material/styles';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import type { LiteDisplayMode } from '../../shared/graphql/documents';
import { useLiteSession } from '../../shared/session';
import { MUI_MODE } from '../app/providers/DisplayModeSync';
import { LITE_UPDATE_PROFILE } from '../graphql/profile';

export const DISPLAY_MODES: readonly LiteDisplayMode[] = ['SYSTEM', 'LIGHT', 'DARK'];
const FROM_MUI: Record<string, LiteDisplayMode> = { system: 'SYSTEM', light: 'LIGHT', dark: 'DARK' };

/**
 * The reader's Light / Dark / System choice: applied at once on this device
 * and, when signed in, saved to the account so it follows them (the header
 * toggle and Settings → Preferences share this, so they always agree).
 */
export function useDisplayMode(): { current: LiteDisplayMode; choose: (next: LiteDisplayMode) => void; next: LiteDisplayMode } {
  const { signedIn } = useLiteSession();
  const { mode, setMode } = useColorScheme();
  const [save] = useMutation(LITE_UPDATE_PROFILE);
  const current = FROM_MUI[mode ?? 'system'] ?? 'SYSTEM';
  const choose = useCallback(
    (next: LiteDisplayMode) => {
      setMode(MUI_MODE[next]);
      if (signedIn) save({ variables: { input: { display_mode: next } } }).catch((error: unknown) => notifyError(parseApiError(error)));
    },
    [setMode, signedIn, save],
  );
  return { current, choose, next: DISPLAY_MODES[(DISPLAY_MODES.indexOf(current) + 1) % DISPLAY_MODES.length] };
}
