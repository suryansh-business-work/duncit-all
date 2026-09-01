import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useApolloTableFetch } from '@duncit/table';
import PaymentReleaseReviewForm, { toReviewInput, type PaymentReleaseReviewValues } from './payment-release-review';
import PaymentReleaseTable from './PaymentReleaseTable';
import { PAYMENT_RELEASE_REQUESTS_TABLE, REVIEW_PAYMENT_RELEASE, type PaymentReleaseRow } from './queries';
import { useTranslation } from '@duncit/app-settings';

export default function PaymentReleasePage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [reviewFor, setReviewFor] = useState<PaymentReleaseRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [review, reviewState] = useMutation<any>(REVIEW_PAYMENT_RELEASE);

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
      // Apollo rejects with an Error carrying a message; the nullish fallback is defensive.
      const message = e.message ?? /* istanbul ignore next */ 'Could not review payment release';
      setActionError(message);
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          mb: 3
        }}>
        <PaymentsIcon color="primary" />
        <Box>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>{t('shell.nav.paymentRelease')}</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>{t('finance.paymentRelease.approveVenueBillingAndHostPayment')}</Typography>
        </Box>
      </Stack>

      <PaymentReleaseTable fetchRows={fetchRows} refetchRef={refetchRef} onReview={setReviewFor} />

      <PaymentReleaseReviewForm request={reviewFor} busy={reviewState.loading} errorMessage={actionError} onClose={() => setReviewFor(null)} onSubmit={submitReview} />
    </Box>
  );
}
