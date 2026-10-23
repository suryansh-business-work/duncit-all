import { useEffect, useId, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Drawer, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import {
  OFFER_POD_CHANGE,
  POD_CHANGE_CANDIDATES,
  type PodChangeCandidateRow,
} from '@duncit/pod-change-requests';
import type { PodChangeRole, PodChangeRow } from '@duncit/utils';
import CandidateList from './CandidateList';

const HINT_KEY: Record<PodChangeRole, string> = {
  VENUE: 'admin.changeRequests.drawerVenueHint',
  HOST: 'admin.changeRequests.drawerHostHint',
  CLUB_ADMIN: 'admin.changeRequests.drawerClubAdminHint',
};

interface Props {
  request: PodChangeRow | null;
  onClose: () => void;
  onOffered: (message: string) => void;
}

/**
 * "Find a replacement" — the side drawer behind the queue's swap action.
 *
 * One step for every role: the admin picks who is asked. A venue answers with
 * its own time and price when it approves (respondToPodChange venue_window), so
 * nothing is picked or reserved for it here — holding a time for an offer that
 * may be passed would take a sellable evening off that venue's calendar.
 */
export default function AssignDrawer({ request, onClose, onOffered }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const [errorText, setErrorText] = useState<string | null>(null);

  const candidates = useQuery<any>(POD_CHANGE_CANDIDATES, {
    variables: { request_id: request?.id ?? '' },
    skip: !request,
    fetchPolicy: 'cache-and-network',
  });
  const [offer, offerState] = useMutation<any>(OFFER_POD_CHANGE);

  // A drawer opened on a different request starts with no stale error.
  useEffect(() => {
    setErrorText(null);
  }, [request?.id]);

  if (!request) return null;

  const rows: PodChangeCandidateRow[] = candidates.data?.podChangeCandidates ?? [];

  const send = (input: { user_id: string; venue_id?: string }) => {
    setErrorText(null);
    offer({ variables: { input: { request_id: request.id, ...input } } })
      .then(() => {
        onOffered(t('admin.changeRequests.sendDone'));
        onClose();
        return undefined;
      })
      .catch((error: Error) => setErrorText(error.message));
  };

  // A venue is offered by its venue; it brings its own time and price when it approves.
  const pickCandidate = (row: PodChangeCandidateRow) =>
    send(request.role === 'VENUE' ? { user_id: row.user_id, venue_id: row.venue_id ?? undefined } : { user_id: row.user_id });

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      slotProps={{ paper: { 'aria-labelledby': titleId, sx: { width: { xs: '100%', sm: 720 } } } }}
    >
      <Stack spacing={2} sx={{ p: 2 }}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Stack sx={{ minWidth: 0 }}>
            <Typography variant="h6" component="h2" id={titleId} sx={{ fontWeight: 900 }}>
              {t('admin.changeRequests.drawerTitle')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {request.change_request_no} · {request.pod.pod_title}
            </Typography>
          </Stack>
          <DuncitIconButton aria-label={t('admin.changeRequests.close')} onClick={onClose}>
            <CloseIcon />
          </DuncitIconButton>
        </Stack>

        <Alert severity="info">{t(HINT_KEY[request.role])}</Alert>

        {request.reason && (
          <Alert severity="warning">
            <strong>{t('admin.changeRequests.reason')}: </strong>
            {request.reason}
          </Alert>
        )}

        {errorText && <Alert severity="error">{errorText}</Alert>}

        <CandidateList
          rows={rows}
          loading={candidates.loading && !candidates.data}
          busy={offerState.loading}
          onPick={pickCandidate}
        />
      </Stack>
    </Drawer>
  );
}
