import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useLazyQuery } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import ContactPhoneOutlinedIcon from '@mui/icons-material/ContactPhoneOutlined';
import { VenueChatContactSheet } from '@duncit/availability-calendar';
import { DuncitButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import { venueChatPath } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import { VENUE_CHAT_ROOM } from '../../venue-chat-page/queries';

/**
 * Under a venue request: the venue's contact and the pod's venue chat, one tap
 * each, so the host can reach the venue while it decides. The contact is read
 * only when asked for — a list of requests never reads one per row. App twin:
 * HostPodsSection/VenueRequestReach.
 */
export default function VenueRequestReach({ podId }: Readonly<{ podId: string }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loadRoom, { data, loading, error }] = useLazyQuery(VENUE_CHAT_ROOM);
  const room = data?.venueChatRoom;

  const showContact = async () => {
    if (room) {
      setOpen(true);
      return;
    }
    try {
      const result = await loadRoom({ variables: { pod_id: podId } });
      if (result.data?.venueChatRoom) setOpen(true);
    } catch (err) {
      // The line under the buttons says so; this is for whoever debugs it.
      logs.mWeb.error('VenueRequestReach', 'loadContact', { error: err });
    }
  };

  return (
    <Stack spacing={0.75}>
      <Stack direction="row" spacing={1}>
        <DuncitButton
          size="small"
          variant="outlined"
          loading={loading}
          startIcon={<ContactPhoneOutlinedIcon />}
          onClick={showContact}
          data-testid={`venue-request-contact-${podId}`}
        >
          {t('availability.offers.chat.contact')}
        </DuncitButton>
        <DuncitButton
          size="small"
          variant="outlined"
          startIcon={<ChatBubbleOutlineIcon />}
          onClick={() => navigate(venueChatPath(podId))}
          data-testid={`venue-request-chat-${podId}`}
        >
          {t('mweb.venueChat.chatWithVenue')}
        </DuncitButton>
      </Stack>
      {error && (
        <Typography role="alert" variant="caption" color="error" data-testid={`venue-request-contact-error-${podId}`}>
          {t('mweb.venueChat.loadFailed')}
        </Typography>
      )}
      <VenueChatContactSheet
        open={open}
        onClose={() => setOpen(false)}
        host={room?.host}
        venue={room?.venue}
        onViewProfile={(host) => navigate(`/u/${encodeURIComponent(host.username || host.user_id)}`)}
        onViewVenue={(venue) => navigate(`/venue/${encodeURIComponent(venue.venue_id)}`)}
      />
    </Stack>
  );
}
