import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Drawer, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import {
  OFFER_POD_CHANGE,
  POD_CHANGE_CANDIDATES,
  POD_CHANGE_VENUE_SLOTS,
  type PodChangeCandidateRow,
  type PodChangeSlotRow,
} from '@duncit/pod-change-requests';
import type { PodChangeRole, PodChangeRow } from '@duncit/utils';
import CandidateList from './CandidateList';
import SlotList from './SlotList';

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
 * Two steps for a venue and one for everybody else: a venue brings a SLOT, and
 * the pod's date and time move to it, so the admin picks the venue and then the
 * time. A host and a club admin bring only themselves.
 *
 * Nothing is reserved by opening this. The slot is checked when the offer is
 * sent and booked only when the venue approves — holding a slot for an offer
 * that may be passed would take a sellable evening off that venue's calendar
 * for as long as they ignore it.
 */
export default function AssignDrawer({ request, onClose, onOffered }: Readonly<Props>) {
  const { t } = useTranslation();
  const [venue, setVenue] = useState<PodChangeCandidateRow | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const candidates = useQuery<any>(POD_CHANGE_CANDIDATES, {
    variables: { request_id: request?.id ?? '' },
    skip: !request,
    fetchPolicy: 'cache-and-network',
  });
  const slots = useQuery<any>(POD_CHANGE_VENUE_SLOTS, {
    variables: { request_id: request?.id ?? '', venue_id: venue?.venue_id ?? '' },
    skip: !request || !venue?.venue_id,
    fetchPolicy: 'cache-and-network',
  });
  const [offer, offerState] = useMutation<any>(OFFER_POD_CHANGE);

  // A drawer opened on a different request must never keep the venue picked
  // for the previous one — that pairing is what the offer is built from.
  useEffect(() => {
    setVenue(null);
    setErrorText(null);
  }, [request?.id]);

  if (!request) return null;

  const rows: PodChangeCandidateRow[] = candidates.data?.podChangeCandidates ?? [];
  const slotRows: PodChangeSlotRow[] = slots.data?.podChangeVenueSlots ?? [];

  const send = (input: { user_id: string; venue_id?: string; venue_slot_id?: string }) => {
    setErrorText(null);
    offer({ variables: { input: { request_id: request.id, ...input } } })
      .then(() => {
        onOffered(t('admin.changeRequests.sendDone'));
        onClose();
        return undefined;
      })
      .catch((error: Error) => setErrorText(error.message));
  };

  const pickCandidate = (row: PodChangeCandidateRow) => {
    if (request.role === 'VENUE') {
      setVenue(row);
      return;
    }
    send({ user_id: row.user_id });
  };

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 720 } } } }}
    >
      <Stack spacing={2} sx={{ p: 2 }}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Stack sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
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

        {venue ? (
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <DuncitButton size="small" variant="outlined" onClick={() => setVenue(null)}>
                {t('admin.changeRequests.backToCandidates')}
              </DuncitButton>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {t('admin.changeRequests.pickSlot', { vars: { venue: venue.label } })}
              </Typography>
            </Stack>
            <SlotList
              rows={slotRows}
              loading={slots.loading && !slots.data}
              busy={offerState.loading}
              onPick={(slot) =>
                send({
                  user_id: venue.user_id,
                  venue_id: venue.venue_id ?? undefined,
                  venue_slot_id: slot.id,
                })
              }
            />
          </Stack>
        ) : (
          <CandidateList
            rows={rows}
            role={request.role}
            loading={candidates.loading && !candidates.data}
            busy={offerState.loading}
            onPick={pickCandidate}
          />
        )}
      </Stack>
    </Drawer>
  );
}
