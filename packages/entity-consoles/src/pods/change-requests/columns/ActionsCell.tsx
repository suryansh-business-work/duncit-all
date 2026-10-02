import { Stack, Tooltip } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { DuncitIconButton } from '@duncit/buttons';
import type { PodChangeRole, PodChangeRow } from '@duncit/utils';
import type { Translate } from './types';

/** "Assign a different venue / host / club admin", per tab. */
const ASSIGN_KEY: Record<PodChangeRole, string> = {
  VENUE: 'admin.changeRequests.assignVenue',
  HOST: 'admin.changeRequests.assignHost',
  CLUB_ADMIN: 'admin.changeRequests.assignClubAdmin',
};

interface ActionsProps {
  row: PodChangeRow;
  role: PodChangeRole;
  t: Translate;
  onCancelPod: (row: PodChangeRow) => void;
  onAssign: (row: PodChangeRow) => void;
}

/**
 * The two answers an admin has.
 *
 * The cross is DESTRUCTIVE — it ends the pod and records a refund against every
 * attendee's payment — so it carries a tooltip that says exactly that, and both
 * are closed once the request is no longer live: a resolved request has nothing
 * left to act on, and an offered one is somebody else's turn.
 */
export default function ActionsCell({ row, role, t, onCancelPod, onAssign }: Readonly<ActionsProps>) {
  const offered = row.status === 'OFFERED';
  const closed = row.status === 'RESOLVED' || row.status === 'WITHDRAWN';
  const waitingOn = offered
    ? t('admin.changeRequests.alreadyOffered', {
        vars: { name: row.offer?.display_name ?? '' },
      })
    : undefined;

  return (
    <Stack component="span" direction="row" spacing={0.25} sx={{ justifyContent: 'flex-end' }}>
      <Tooltip title={waitingOn ?? t(ASSIGN_KEY[role])}>
        <span>
          <DuncitIconButton
            size="small"
            color="warning"
            disabled={closed || offered}
            aria-label={t(ASSIGN_KEY[role])}
            onClick={() => onAssign(row)}
          >
            <SwapHorizIcon fontSize="small" />
          </DuncitIconButton>
        </span>
      </Tooltip>
      <Tooltip title={t('admin.changeRequests.cancelTooltip')}>
        <span>
          <DuncitIconButton
            size="small"
            color="error"
            disabled={closed || row.pod_cancelled}
            aria-label={t('admin.changeRequests.cancelTitle')}
            onClick={() => onCancelPod(row)}
          >
            <EventBusyIcon fontSize="small" />
          </DuncitIconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
