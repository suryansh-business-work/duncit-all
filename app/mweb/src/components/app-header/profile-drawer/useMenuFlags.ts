import { useMemo } from 'react';
import { PRODUCT_VISIBILITY_FLAG } from '@duncit/app-settings';
import { profileMenuFlagsFrom, type ProfileMenuFlags } from '@duncit/utils';
import { usePublicFeatureFlags } from '../../../hooks/useFeatureFlag';

/** The server flags the account menu's catalogue is gated on. Stable until the
 * flag list changes, so what is built from it can be memoised. Native twin:
 * components/Sidebar/useMenuFlags. */
export function useMenuFlags(): ProfileMenuFlags {
  const rows = usePublicFeatureFlags();
  return useMemo(() => profileMenuFlagsFrom(rows, PRODUCT_VISIBILITY_FLAG), [rows]);
}
