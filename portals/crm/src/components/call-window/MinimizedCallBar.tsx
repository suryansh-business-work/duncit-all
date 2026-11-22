import { Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { fireAndForget, logs } from '@duncit/logs';
import { callStatusView } from '../call/callStatusView';
import CallControls from './CallControls';
import { formatDuration, useCallClock } from './useCallClock';
import type { CallSession } from './useCallSession';

/** What a minimized call window keeps on show: status, duration, Mute and End. */
export default function MinimizedCallBar({ session }: Readonly<{ session: CallSession }>) {
  const { t } = useTranslation();
  const seconds = useCallClock(session.answeredAt, session.live);
  const view = callStatusView(session.status, session.onHold);

  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }} data-testid="call-window-minimized">
      <Chip size="small" color={view.tone} label={t(view.labelKey)} />
      <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', flex: 1 }} aria-label={t('crm.call.duration')}>
        {formatDuration(seconds)}
      </Typography>
      {session.live && (
        <CallControls
          compact
          muted={session.muted}
          onHold={session.onHold}
          connected={session.status === 'IN_PROGRESS'}
          busy={session.busy}
          onControl={(action) => fireAndForget(session.control(action), logs.portal.crm, 'MinimizedCallBar', action)}
        />
      )}
    </Stack>
  );
}
