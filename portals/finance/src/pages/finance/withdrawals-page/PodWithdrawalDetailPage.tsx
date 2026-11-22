import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Box, Chip, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitIconButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { QueryGuard } from '@duncit/ui';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import {
  POD_WITHDRAWALS_TABLE,
  POD_WITHDRAWAL_SUMMARY,
  RETRY_WITHDRAWAL_PAYOUT,
  type PodWithdrawalGroup,
  type WithdrawalRow,
} from './queries';
import { translatedRoleLabel } from './roles';
import WithdrawalReviewDialogs from './WithdrawalReviewDialogs';
import WithdrawalsTable from './WithdrawalsTable';

interface SummaryData {
  podWithdrawalSummary: PodWithdrawalGroup | null;
}

/**
 * Withdrawal Payments, level 2: every request raised against ONE pod.
 *
 * The table below is deliberately the same one the page used to show flat —
 * same columns, same order, same actions — because this is where Finance still
 * does the work. Only the way in changed.
 */
export default function PodWithdrawalDetailPage() {
  const { podId } = useParams<{ podId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [retry, { loading: retrying }] = useMutation(RETRY_WITHDRAWAL_PAYOUT);

  const { data, loading, error, refetch } = useQuery<SummaryData>(POD_WITHDRAWAL_SUMMARY, {
    variables: { pod_id: podId },
    skip: !podId,
    fetchPolicy: 'cache-and-network',
  });
  const summary = data?.podWithdrawalSummary;

  // podId rides in `deps` because useApolloTableFetch's memo key does not
  // include `options` — without it the table would keep querying the first pod.
  const fetchRows = useApolloTableFetch<WithdrawalRow>(
    client,
    POD_WITHDRAWALS_TABLE,
    'podWithdrawalsTable',
    { extraVariables: { pod_id: podId } },
    [podId],
  );

  // The list and the header both re-read after any change: the header's
  // Pending/Approved reads across every request on this pod, so one payment can
  // settle the whole pod.
  const refreshAll = useCallback(() => {
    refetchRef.current?.();
    refetch().catch(() => undefined);
  }, [refetch]);

  // Never rejects — errors surface via the toast, so callers can fire-and-forget.
  const retryPayout = useCallback(
    async (w: WithdrawalRow) => {
      try {
        await retry({ variables: { id: w.id } });
        notifySuccess(t('finance.payouts.toastRetried'));
        refreshAll();
      } catch (e) {
        notifyError(parseApiError(e));
      }
    },
    [retry, refreshAll, t],
  );

  const openReview = useCallback((w: WithdrawalRow) => setReviewId(w.id), []);
  const closeReview = useCallback(() => setReviewId(null), []);

  return (
    <QueryGuard
      loading={loading && !summary}
      error={error}
      notFound={!summary}
      notFoundText={t('finance.withdrawals.notFound')}
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() => {
        if (!summary) return null;
        return (
          <Box>
            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                alignItems: "center",
                mb: 3
              }}>
              <DuncitIconButton
                aria-label={t('finance.withdrawals.back')}
                onClick={() => navigate('/withdrawals')}
              >
                <ArrowBackIcon />
              </DuncitIconButton>
              <Box sx={{ flex: 1 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{
                    alignItems: "center",
                    flexWrap: "wrap"
                  }}>
                  <Typography component="h1" variant="h5" sx={{
                    fontWeight: 700
                  }}>
                    {summary.pod_title}
                  </Typography>
                  <Chip
                    size="small"
                    color={summary.status === 'APPROVED' ? 'success' : 'warning'}
                    label={
                      summary.status === 'APPROVED'
                        ? t('finance.withdrawals.statusApproved')
                        : t('finance.withdrawals.statusPending')
                    }
                  />
                </Stack>
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  {t('finance.withdrawals.detailSubtitle')}
                  {summary.requested_from.length > 0
                    ? ` · ${summary.requested_from.map((role) => translatedRoleLabel(t, role)).join(', ')}`
                    : ''}
                </Typography>
              </Box>
            </Stack>

            <WithdrawalsTable
              tableId="finance-withdrawals-pod"
              podId={summary.pod_id}
              fetchRows={fetchRows}
              refetchRef={refetchRef}
              busy={retrying}
              emptyText={t('finance.withdrawals.detailEmpty')}
              onReview={openReview}
              onRetry={retryPayout}
            />

            <WithdrawalReviewDialogs reviewId={reviewId} onClose={closeReview} onDecided={refreshAll} />
          </Box>
        );
      }}
    </QueryGuard>
  );
}
