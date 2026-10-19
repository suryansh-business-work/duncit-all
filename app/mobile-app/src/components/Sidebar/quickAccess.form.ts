import { z } from 'zod';
import {
  QUICK_ACCESS_SIZE,
  isValidQuickAccess,
  type ProfileMenuFlags,
  type ProfileMenuKey,
} from '@duncit/utils';

import type { Translate } from '@/i18n/fallback';

export interface QuickAccessFormValues {
  selection: ProfileMenuKey[];
}

/** The Quick Access editor's schema: exactly six distinct destinations, each
 * pickable under `flags` — the shared `isValidQuickAccess` rule mWeb's editor
 * refines on too. */
export function makeQuickAccessSchema(t: Translate, flags: ProfileMenuFlags) {
  return z.object({
    selection: z.array(z.string()).refine((selection) => isValidQuickAccess(selection, flags), {
      message: t('mweb.sidebar.editorInvalid', { vars: { max: QUICK_ACCESS_SIZE } }),
    }),
  });
}
