import { useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { LocationDialog } from '@/components/LocationDialog';
import { useTranslation } from '@/hooks/useTranslation';

/** Empty state shown on the Clubs tab when the selected locality has no active
 * clubs. Offers a "Reset Location" action that re-opens the location picker so
 * the user can pick a different location. mWeb twin: ClubsPage's empty state. */
export function ClubsLocationEmpty() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <EmptyState
        testID="clubs-location-empty"
        icon="location-off"
        title="No Clubs operating at the selected location,"
        actionLabel={t('mweb.home.resetLocation')}
        actionTestID="clubs-location-reset"
        onAction={() => setOpen(true)}
      />
      <LocationDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
