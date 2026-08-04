import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CircularProgress, Divider, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { APPROVE_SLOT_REQUEST, DECLINE_SLOT_REQUEST } from '../slot-requests-page/queries';
import { VENUE_SLOT_DECISION, type SlotDecisionRow } from './queries';
import DecisionHeader from './DecisionHeader';
import DeclineForm from './DeclineForm';
import EarningsBreakdown from './EarningsBreakdown';
import SlotSummary from './SlotSummary';

/**
 * The page the request email's Approve / Decline buttons open — and the same
 * page the Slot Requests list links to. `?action=approve` confirms the booking
 * on arrival; `?action=decline` opens the reason form. Both then stay on the
 * outcome, which is re-readable later because the decision is stored on the slot.
 *
 * Auth is the guard: the route is behind RequireAuth, so a mail scanner
 * following the link cannot decide anything, and the owner lands back here
 * after logging in (the query string survives the bounce).
 */
export default function SlotDecisionPage() {
  const { slotId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const intent = searchParams.get('action');

  const { data, loading, error, refetch } = useQuery<{ venueSlotDecision: SlotDecisionRow }>(
    VENUE_SLOT_DECISION,
    { variables: { slot_id: slotId }, fetchPolicy: 'cache-and-network', skip: !slotId }
  );
  const [approve, approveState] = useMutation(APPROVE_SLOT_REQUEST);
  const [decline, declineState] = useMutation(DECLINE_SLOT_REQUEST);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDeclineForm, setShowDeclineForm] = useState(false);

  const request = data?.venueSlotDecision;
  const pending = request?.decision === 'NONE';

  // `?action=approve` is an explicit instruction from the email button, so it
  // is honoured on arrival. The ref keeps a re-render (or a refetch) from
  // firing it twice; the server rejects a second approve anyway.
  const autoApproved = useRef(false);
  useEffect(() => {
    if (intent !== 'approve' || !pending || autoApproved.current) return;
    autoApproved.current = true;
    approve({ variables: { slot_id: slotId } })
      .then(() => refetch())
      .catch((err: Error) => setActionError(err.message));
  }, [intent, pending, slotId, approve, refetch]);

  useEffect(() => {
    if (intent === 'decline' && pending) setShowDeclineForm(true);
  }, [intent, pending]);

  const submitDecline = (reason: string) => {
    setActionError(null);
    decline({ variables: { slot_id: slotId, reason } })
      .then(() => {
        setShowDeclineForm(false);
        return refetch();
      })
      .catch((err: Error) => setActionError(err.message));
  };

  const runApprove = () => {
    setActionError(null);
    approve({ variables: { slot_id: slotId } })
      .then(() => refetch())
      .catch((err: Error) => setActionError(err.message));
  };

  if (loading && !request) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!request) return <Alert severity="warning">This booking request could not be found.</Alert>;

  const busy = approveState.loading || declineState.loading;
  const declined = request.decision === 'DECLINED';

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 720, mx: 'auto' }}>
      <DecisionHeader decision={request.decision} startAt={request.start_at} />

      {actionError && <Alert severity="error">{actionError}</Alert>}

      <Card variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <SlotSummary request={request} />
        <Divider sx={{ my: 2 }} />
        <EarningsBreakdown request={request} lost={declined} />

        {declined && request.decline_reason && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Reason shared with the host: “{request.decline_reason}”
          </Alert>
        )}

        {pending && !showDeclineForm && (
          <Stack
            direction={{ xs: 'column-reverse', sm: 'row' }}
            spacing={1}
            justifyContent="flex-end"
            sx={{ mt: 2.5 }}
          >
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              disabled={busy}
              onClick={() => setShowDeclineForm(true)}
            >
              Decline
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              disabled={busy}
              onClick={runApprove}
            >
              {approveState.loading ? 'Approving…' : 'Approve booking'}
            </Button>
          </Stack>
        )}

        {pending && showDeclineForm && (
          <Box sx={{ mt: 2.5 }}>
            <DeclineForm
              busy={busy}
              onSubmit={submitDecline}
              onCancel={() => setShowDeclineForm(false)}
            />
          </Box>
        )}
      </Card>

      <Stack direction="row" justifyContent="center">
        <Button onClick={() => navigate('/venues/requests')}>See all slot requests</Button>
      </Stack>
    </Stack>
  );
}
