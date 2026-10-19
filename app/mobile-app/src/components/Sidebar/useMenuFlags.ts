import { useMemo } from 'react';
import { profileMenuFlagsFrom, type ProfileMenuFlags } from '@duncit/utils';

import { usePublicFeatureFlags } from '@/hooks/useFeatureFlag';
import { PRODUCT_VISIBILITY_FLAG } from '@/hooks/useProductVisibility';

/** The server flags the account menu's catalogue is gated on. Stable until the
 * flag list changes, so what is built from it can be memoised. mWeb twin:
 * profile-drawer/useMenuFlags. */
export function useMenuFlags(): ProfileMenuFlags {
  const rows = usePublicFeatureFlags();
  return useMemo(() => profileMenuFlagsFrom(rows, PRODUCT_VISIBILITY_FLAG), [rows]);
}
