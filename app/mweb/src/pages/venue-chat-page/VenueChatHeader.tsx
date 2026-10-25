import { Avatar, Box, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import { VenueChatContactLine } from '@duncit/availability-calendar';
import { DuncitRoundButton } from '@duncit/buttons';
import type { VenueChatCounterpart } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { useDateFormat } from '../../utils/dateFormat';
import { HEADER_BUTTON_SX } from '../support-chat/calmStyles';

interface Props {
  /** Who the reader is talking to; null while it loads or when the thread is closed to them. */
  counterpart: VenueChatCounterpart | null;
  /** The reader is the venue: the face is the pod's, not a venue photo. */
  venueSide: boolean;
  onBack: () => void;
}

/**
 * The thread's top bar: back, then who it is with — the venue for a host, the
 * pod for the venue — and how to reach them outside the chat.
 */
export default function VenueChatHeader({ counterpart, venueSide, onBack }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const when = counterpart?.when ? formatDateTime(counterpart.when) : '';
  const about = [counterpart?.podTitle, when].filter(Boolean).join(' · ');

  return (
    <Stack
      direction="row"
      spacing={1.5}
      data-testid="venue-chat-header"
      sx={{ alignItems: 'center', px: { xs: 1.25, sm: 2 }, py: 1, bgcolor: 'background.default' }}
    >
      <DuncitRoundButton
        data-testid="venue-chat-back"
        aria-label={t('mweb.common.goBack')}
        onClick={onBack}
        sx={HEADER_BUTTON_SX}
      >
        <ArrowBackRoundedIcon />
      </DuncitRoundButton>
      {counterpart && (
        <Avatar alt="" src={counterpart.photo ?? undefined} sx={{ width: 40, height: 40 }}>
          {venueSide ? <EventRoundedIcon /> : <StorefrontRoundedIcon />}
        </Avatar>
      )}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          component="h1"
          variant="subtitle1"
          noWrap
          data-testid="venue-chat-title"
          sx={{ m: 0, fontWeight: 600, lineHeight: 1.2 }}
        >
          {counterpart?.name ?? ''}
        </Typography>
        {about && (
          <Typography variant="caption" noWrap sx={{ display: 'block', color: 'text.secondary', fontWeight: 500 }}>
            {about}
          </Typography>
        )}
        <VenueChatContactLine contact={counterpart?.contact ?? null} />
      </Box>
    </Stack>
  );
}
