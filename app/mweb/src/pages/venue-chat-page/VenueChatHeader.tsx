import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Avatar, Box, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ContactPhoneOutlinedIcon from '@mui/icons-material/ContactPhoneOutlined';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import { VenueChatContactSheet } from '@duncit/availability-calendar';
import { DuncitButton, DuncitRoundButton } from '@duncit/buttons';
import type { VenueChatCounterpart, VenueChatHostCard, VenueChatVenueCard } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { useDateFormat } from '../../utils/dateFormat';
import { HEADER_BUTTON_SX } from '../support-chat/calmStyles';

interface Props {
  /** Who the reader is talking to; null while it loads or when the thread is closed to them. */
  counterpart: VenueChatCounterpart | null;
  /** The reader is the venue: the face is the pod's, not a venue photo. */
  venueSide: boolean;
  /** Both sides' cards for the contact sheet; absent until the room loads. */
  parties?: { host?: VenueChatHostCard | null; venue?: VenueChatVenueCard | null };
  onBack: () => void;
}

/**
 * The thread's top bar: back, then who it is with — the venue for a host, the
 * pod for the venue — and a Contact button that raises a sheet over the chat
 * with both sides' details and profiles: the host's and the venue's faces,
 * phones, emails and pages. The chat stays where it was underneath.
 */
export default function VenueChatHeader({ counterpart, venueSide, parties, onBack }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatDateTime } = useDateFormat();
  const [contactOpen, setContactOpen] = useState(false);
  const when = counterpart?.when ? formatDateTime(counterpart.when) : '';
  const about = [counterpart?.podTitle, when].filter(Boolean).join(' · ');

  return (
    <Stack
      direction="row"
      spacing={1.5}
      data-testid="venue-chat-header"
      sx={{ alignItems: 'center', px: { xs: 1.25, sm: 2 }, py: 1, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}
    >
      <DuncitRoundButton data-testid="venue-chat-back" aria-label={t('mweb.common.goBack')} onClick={onBack} sx={HEADER_BUTTON_SX}>
        <ArrowBackRoundedIcon />
      </DuncitRoundButton>
      {counterpart && (
        <Avatar alt="" src={counterpart.photo ?? undefined} sx={{ width: 40, height: 40 }}>
          {venueSide ? <EventRoundedIcon /> : <StorefrontRoundedIcon />}
        </Avatar>
      )}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography component="h1" variant="subtitle1" noWrap data-testid="venue-chat-title" sx={{ m: 0, fontWeight: 600, lineHeight: 1.2 }}>
          {counterpart?.name ?? ''}
        </Typography>
        {about && (
          <Typography variant="caption" noWrap sx={{ display: 'block', color: 'text.secondary', fontWeight: 500 }}>
            {about}
          </Typography>
        )}
      </Box>
      {parties && (
        <DuncitButton
          size="small"
          variant="outlined"
          startIcon={<ContactPhoneOutlinedIcon />}
          onClick={() => setContactOpen(true)}
          data-testid="venue-chat-contact-open"
        >
          {t('availability.offers.chat.contact')}
        </DuncitButton>
      )}
      {parties && (
        <VenueChatContactSheet
          open={contactOpen}
          onClose={() => setContactOpen(false)}
          host={parties.host}
          venue={parties.venue}
          onViewProfile={(host) => navigate(`/u/${encodeURIComponent(host.username || host.user_id)}`)}
          onViewVenue={(venue) => navigate(`/venue/${encodeURIComponent(venue.venue_id)}`)}
        />
      )}
    </Stack>
  );
}
