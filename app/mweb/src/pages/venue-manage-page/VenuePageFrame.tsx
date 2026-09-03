import type { ReactNode } from 'react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import type { SwitchableVenue } from '@duncit/utils';
import StudioPageHeader from '../../components/StudioPageHeader';
import NoVenuesAlert from './NoVenuesAlert';
import VenueSwitcher from './VenueSwitcher';

interface Props {
  icon: ReactNode;
  title: string;
  caption: string;
  venues: SwitchableVenue[];
  /** The venue the switcher landed on — null once the list is known empty. */
  venue: SwitchableVenue | null;
  onSelect: (venueId: string) => void;
  /** The first load, before any list has arrived. */
  loading: boolean;
  error?: { message: string };
  /** The page's own sentence for an owner with no venue yet. */
  noVenuesMessage: string;
  /** What the page shows for the selected venue. */
  children: ReactNode;
}

/**
 * The frame every per-venue page shares: the studio header, the switcher and
 * the three states that come before a venue can be shown — first load, a
 * failed load, no venue at all. The availability calendar and the settings
 * page differ only in what they render for the venue (rule 40).
 */
export default function VenuePageFrame({
  icon,
  title,
  caption,
  venues,
  venue,
  onSelect,
  loading,
  error,
  noVenuesMessage,
  children,
}: Readonly<Props>) {
  let body: ReactNode;
  if (loading) {
    body = (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  } else if (error) {
    body = <Alert severity="error">{error.message}</Alert>;
  } else if (venue) {
    body = children;
  } else {
    body = <NoVenuesAlert message={noVenuesMessage} />;
  }

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <StudioPageHeader icon={icon} title={title} caption={caption} />
      <VenueSwitcher venues={venues} venueId={venue?.id ?? null} onChange={onSelect} />
      {body}
    </Stack>
  );
}
