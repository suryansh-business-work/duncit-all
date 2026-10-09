import { useMemo } from 'react';
import { useTranslation } from '@duncit/shell';
import type { PartnerRole } from '../../config/partner-sections';

export interface StudioCopy {
  name: string;
  caption: string;
  /** The switcher's way in for somebody who does not hold this studio yet. */
  join: string;
}

/**
 * Each studio's words for the switcher — written out per studio so every key
 * stays a literal (verify-translation-keys greps for them).
 */
export function useStudioCopy(): Record<PartnerRole, StudioCopy> {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      CLUB_ADMIN: {
        name: t('shell.nav.clubAdminStudio'),
        caption: t('shell.nav.clubAdminStudioCaption'),
        join: t('shell.nav.clubAdminStudio'),
      },
      VENUE_OWNER: {
        name: t('shell.nav.venueStudio'),
        caption: t('shell.nav.venueStudioCaption'),
        join: t('shell.nav.venueStudio'),
      },
      HOST: {
        name: t('shell.nav.hostStudio'),
        caption: t('shell.nav.hostStudioCaption'),
        join: t('shell.nav.beAHost'),
      },
      ECOMM_MANAGER: {
        name: t('shell.nav.brandStudio'),
        caption: t('shell.nav.brandStudioCaption'),
        join: t('shell.nav.becomeAnECommerceBrandPartner'),
      },
    }),
    [t],
  );
}
