import { z } from 'zod';
import { QUICK_ACCESS_SIZE, isValidQuickAccess, type ProfileMenuFlags, type ProfileMenuKey } from '@duncit/utils';
import type { Translate } from './translate';

/** What the account menu's "Edit Quick Access" editor holds: the picked tiles, in grid order. */
export interface QuickAccessValues {
  selection: ProfileMenuKey[];
}

/**
 * The Quick Access editor's schema: exactly {@link QUICK_ACCESS_SIZE} distinct
 * destinations, each pickable under `flags` (the shared `isValidQuickAccess`
 * rule). One contract for mWeb's dialog and the native sheet.
 */
export function makeQuickAccessSchema(t: Translate, flags: ProfileMenuFlags) {
  return z.object({
    selection: z.array(z.string()).refine((selection) => isValidQuickAccess(selection, flags), {
      message: t('mweb.sidebar.editorInvalid', { vars: { max: QUICK_ACCESS_SIZE } }),
    }),
  });
}
