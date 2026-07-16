import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useApolloTableFetch } from '@duncit/table';
import PaymentReleaseReviewForm, { toReviewInput, type PaymentReleaseReviewValues } from './payment-release-review';
import PaymentReleaseTable from './PaymentReleaseTable';
import { PAYMENT_RELEASE_REQUESTS_TABLE, REVIEW_PAYMENT_RELEASE, type PaymentReleaseRow } from './queries';

export default function PaymentReleasePage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [reviewFor, setReviewFor] = useState<PaymentReleaseRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [review, reviewState] = useMutation(REVIEW_PAYMENT_RELEASE);

  const fetchRows = useApolloTableFetch<PaymentReleaseRow>(
    client,
    PAYMENT_RELEASE_REQUESTS_TABLE,
    'paymentReleaseRequestsTable',
  );

  const submitReview = async (values: PaymentReleaseReviewValues) => {
    // The review form is only mounted (and submittable) while a request is selected.
    const request = reviewFor as PaymentReleaseRow;
    setActionError(null);
    try {
      await review({ variables: { id: request.id, input: toReviewInput(values, Number(request.amount_requested || 0)) } });
      setReviewFor(null);
      refetchRef.current?.();
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

      <PaymentReleaseTable fetchRows={fetchRows} refetchRef={refetchRef} onReview={setReviewFor} />

      <PaymentReleaseReviewForm request={reviewFor} busy={reviewState.loading} errorMessage={actionError} onClose={() => setReviewFor(null)} onSubmit={submitReview} />
    </Box>
  );
}
