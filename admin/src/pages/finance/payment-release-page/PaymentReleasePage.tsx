import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import PaymentReleaseReviewForm, { toReviewInput, type PaymentReleaseReviewValues } from './payment-release-review';
import PaymentReleaseTable from './PaymentReleaseTable';
import { PAYMENT_RELEASE_REQUESTS, REVIEW_PAYMENT_RELEASE } from './queries';

export default function PaymentReleasePage() {
  const [status, setStatus] = useState('PENDING');
  const [kind, setKind] = useState('');
  const [reviewFor, setReviewFor] = useState<any | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const filter = useMemo(() => ({ status: status || undefined, kind: kind || undefined }), [kind, status]);
  const { data, loading, error, refetch } = useQuery(PAYMENT_RELEASE_REQUESTS, { variables: { filter }, fetchPolicy: 'cache-and-network' });
  const [review, reviewState] = useMutation(REVIEW_PAYMENT_RELEASE);

  const submitReview = async (values: PaymentReleaseReviewValues) => {
    if (!reviewFor) return;
    setActionError(null);
    try {
      await review({ variables: { id: reviewFor.id, input: toReviewInput(values, Number(reviewFor.amount_requested || 0)) } });
      setReviewFor(null);
      await refetch();
    } catch (e: any) {
      setActionError(e.message ?? 'Could not review payment release');
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <PaymentsIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>Payment Release</Typography>
          <Typography variant="body2" color="text.secondary">Approve venue billing and host payment release requests.</Typography>
        </Box>
      </Stack>
      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField select size="small" label="Status" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: 180 }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
            </TextField>
            <TextField select size="small" label="Type" value={kind} onChange={(event) => setKind(event.target.value)} sx={{ minWidth: 200 }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="VENUE_BILLING">Venue Billing</MenuItem>
              <MenuItem value="HOST_PAYMENT">Host Payment</MenuItem>
            </TextField>
          </Stack>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}
          <PaymentReleaseTable rows={data?.paymentReleaseRequests ?? []} loading={loading} onReview={setReviewFor} />
        </CardContent>
      </Card>
      <PaymentReleaseReviewForm request={reviewFor} busy={reviewState.loading} errorMessage={actionError} onClose={() => setReviewFor(null)} onSubmit={submitReview} />
    </Box>
  );
}