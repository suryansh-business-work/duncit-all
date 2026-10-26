import { Drawer, IconButton, Stack, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import { useTranslation } from '@duncit/app-settings';
import type { VenueChatHostCard, VenueChatVenueCard } from '@duncit/utils';
import PartyCard from './PartyCard';

interface Props {
  open: boolean;
  onClose: () => void;
  /** The pod's lead host; null when none is on record (or an older server). */
  host: VenueChatHostCard | null | undefined;
  venue: VenueChatVenueCard | null | undefined;
  /** Opens the host's profile; left out, the card offers no link. */
  onViewProfile?: (host: VenueChatHostCard) => void;
  /** Opens the venue's page; left out, the card offers no link. */
  onViewVenue?: (venue: VenueChatVenueCard) => void;
}

/** The facts a host's card lists: their @handle and their bio. */
const hostDetails = (host: VenueChatHostCard) => [host.username ? `@${host.username}` : '', host.bio].filter(Boolean);

/**
 * Both sides of a venue booking's chat on one sheet that rises over the thread
 * (the chat stays where it was): the host — face, name, handle, bio — and the
 * venue — photo, name, type, capacity, address, who to ask for — each with a
 * phone to dial, an email to write to and a link to their page.
 */
export default function VenueChatContactSheet({ open, onClose, host, venue, onViewProfile, onViewVenue }: Readonly<Props>) {
  const { t } = useTranslation();
  const venueDetails = venue
    ? [
        [venue.venue_type, venue.capacity > 0 ? t('availability.offers.chat.capacity', { vars: { count: venue.capacity } }) : '']
          .filter(Boolean)
          .join(' · '),
        venue.address,
        venue.name ? t('availability.offers.chat.contactPerson', { vars: { name: venue.name } }) : '',
      ].filter(Boolean)
    : [];

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { maxHeight: '85vh' }, 'aria-labelledby': 'venue-chat-contact-title' } }}
      data-testid="venue-chat-contact-sheet"
    >
      <Stack spacing={2} sx={{ p: 2, maxWidth: 640, width: '100%', mx: 'auto' }}>
        <Stack direction="row" sx={{ alignItems: 'center' }}>
          <Typography id="venue-chat-contact-title" variant="h6" component="h2" sx={{ fontWeight: 800, flex: 1 }}>
            {t('availability.offers.chat.contactTitle')}
          </Typography>
          <IconButton aria-label={t('availability.offers.chat.close')} onClick={onClose} data-testid="venue-chat-contact-close">
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
        {host && (
          <PartyCard
            role={t('availability.offers.chat.hostCard')}
            name={host.name}
            photo={host.photo}
            fallbackIcon={<PersonRoundedIcon />}
            details={hostDetails(host)}
            phone={host.phone}
            email={host.email}
            action={onViewProfile ? { label: t('availability.offers.chat.viewProfile'), onClick: () => onViewProfile(host) } : undefined}
            testId="venue-chat-host-card"
          />
        )}
        {venue && (
          <PartyCard
            role={t('availability.offers.chat.venueCard')}
            name={venue.venue_name}
            photo={venue.photo}
            fallbackIcon={<StorefrontRoundedIcon />}
            details={venueDetails}
            phone={venue.phone}
            email={venue.email}
            action={onViewVenue ? { label: t('availability.offers.chat.viewVenue'), onClick: () => onViewVenue(venue) } : undefined}
            testId="venue-chat-venue-card"
          />
        )}
      </Stack>
    </Drawer>
  );
}
