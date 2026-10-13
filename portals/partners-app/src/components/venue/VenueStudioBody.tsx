import type { ReactNode } from 'react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { SwitchableVenue } from '@duncit/utils';
import VenuePicker from './VenuePicker';
import { useSelectedVenue } from './useSelectedVenue';

interface Props<T extends SwitchableVenue> {
  /** The partner's venues; undefined until the first answer is in. */
  venues: readonly T[] | undefined;
  loading: boolean;
  /** The page's own alert for a failed read, when it failed. */
  errorAlert: ReactNode;
  /** What the page shows for the selected venue, under the picker. */
  children: (venue: T) => ReactNode;
}

/**
 * What a one-venue Venue Studio page shows under its header: a spinner until
 * the venues are in, the page's error when the read failed, then the venue
 * picker over the page's content for the selected venue — or the "no venues
 * yet" notice for a partner who has none.
 */
export default function VenueStudioBody<T extends SwitchableVenue>({
  venues,
  loading,
  errorAlert,
  children,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const list = venues ?? [];
  const { venue, venueId, selectVenue } = useSelectedVenue(list);

  if (loading && !venues) {
    return (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={24} aria-label={t('shell.a11y.loading')} />
      </Stack>
    );
  }
  if (errorAlert) return errorAlert;
  if (!venue) return <Alert severity="info">{t('mweb.studioOptions.noVenuesYet')}</Alert>;
  return (
    <>
      <VenuePicker venues={list} value={venueId} onChange={selectVenue} />
      {children(venue)}
    </>
  );
}
