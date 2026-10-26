import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ContactPhoneOutlinedIcon from '@mui/icons-material/ContactPhoneOutlined';
import { VenueChatContactSheet } from '@duncit/availability-calendar';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { fmtDate } from '../venue-pods-page/queries';
import VenueChatThread from './VenueChatThread';
import { VENUE_CHAT_POLL_MS, VENUE_CHAT_ROOM, venueChatErrorKey } from './queries';

/**
 * `/venues/pods/:podId/chat` — the venue owner's private chat with the hosts
 * of one pod booked at their venue, where the two bargain over the booking
 * offer; a Contact button opens both sides' details and profiles over the
 * thread. The room is re-read with the thread's poll, so the host's "seen" face
 * moves as they read. The server decides membership: anyone else gets FORBIDDEN
 * and reads why instead of an empty thread.
 */
export default function VenueChatPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { podId = '' } = useParams();
  const room = useQuery(VENUE_CHAT_ROOM, {
    variables: { pod_id: podId },
    skip: !podId,
    fetchPolicy: 'cache-and-network',
    pollInterval: VENUE_CHAT_POLL_MS,
  });
  const [contactOpen, setContactOpen] = useState(false);
  const info = room.data?.venueChatRoom;

  const retry = () =>
    fireAndForget(room.refetch(), logs.portal['partners-app'], 'VenueChatPage', 'VenueChatPage.retry');

  const renderBody = () => {
    if (room.loading && !info) {
      return (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress aria-label={t('shell.a11y.loading')} />
        </Box>
      );
    }
    if (room.error) {
      return (
        <Alert severity="error" action={<DuncitButton onClick={retry}>{t('shell.common.retry')}</DuncitButton>}>
          {t(venueChatErrorKey(room.error))}
        </Alert>
      );
    }
    if (!info) return <Alert severity="warning">{t('partners.venueChat.notFound')}</Alert>;
    return (
      <>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 900 }}>
              {t('partners.venueChat.title', { vars: { pod: info.pod_title } })}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {info.venue_name} · {fmtDate(info.pod_date_time)}
            </Typography>
          </Stack>
          <DuncitButton variant="outlined" startIcon={<ContactPhoneOutlinedIcon />} onClick={() => setContactOpen(true)} data-testid="venue-chat-contact-open">
            {t('availability.offers.chat.contact')}
          </DuncitButton>
        </Stack>
        <VenueChatContactSheet open={contactOpen} onClose={() => setContactOpen(false)} host={info.host} venue={info.venue} />
        <VenueChatThread
          podId={info.pod_id}
          side={info.my_side}
          podIsFree={!!info.pod_is_free}
          marks={info.read_marks ?? []}
          subject={{ pod_id: info.pod_id, pod_title: info.pod_title, venue_name: info.venue_name }}
        />
      </>
    );
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Box>
        <DuncitButton startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/venues/pods')}>
          {t('partners.venueChat.backToPods')}
        </DuncitButton>
      </Box>
      {renderBody()}
    </Stack>
  );
}
