import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Chip, IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useApolloTableFetch } from '@duncit/table';
import { QueryGuard } from '@duncit/ui';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import {
  POD_WITHDRAWALS_TABLE,
  POD_WITHDRAWAL_SUMMARY,
  REVIEW_WITHDRAWAL,
  type PodWithdrawalGroup,
  type WithdrawalRow,
} from './queries';
import { translatedRoleLabel } from './roles';
import WithdrawalReviewDialogs from './WithdrawalReviewDialogs';
import WithdrawalsTable from './WithdrawalsTable';

interface SummaryData {
  podWithdrawalSummary: PodWithdrawalGroup | null;
}

type RejectTarget = { id: string; name: string };

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
  const [reject, setReject] = useState<RejectTarget | null>(null);
  const [payTarget, setPayTarget] = useState<WithdrawalRow | null>(null);
  const [review, { loading: reviewing }] = useMutation(REVIEW_WITHDRAWAL);

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

  // Never rejects — errors surface via the toast, so callers can fire-and-forget.
  const submit = useCallback(
    async (id: string, nextStatus: 'PAID' | 'REJECTED', why?: string) => {
      try {
        await review({ variables: { id, input: { status: nextStatus, reason: why } } });
        setReject(null);
        setPayTarget(null);
        notifySuccess(nextStatus === 'PAID' ? 'Marked as paid' : 'Withdrawal rejected');
        refetchRef.current?.();
        // The header's Pending/Approved reads across every request on this pod,
        // so it has to re-read too — one payment can settle the whole pod.
        refetch().catch(() => undefined);
      } catch (e) {
        notifyError(parseApiError(e));
      }
    },
    [review, refetch],
  );

  const openMarkPaid = useCallback((w: WithdrawalRow) => setPayTarget(w), []);
  const openReject = useCallback(
    (w: WithdrawalRow) => setReject({ id: w.id, name: w.beneficiary_name }),
    [],
  );
  const confirmMarkPaid = useCallback(() => {
    if (payTarget) submit(payTarget.id, 'PAID');
  }, [payTarget, submit]);

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
              <IconButton
                aria-label={t('finance.withdrawals.back')}
                onClick={() => navigate('/withdrawals')}
              >
                <ArrowBackIcon />
              </IconButton>
              <Box sx={{ flex: 1 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{
                    alignItems: "center",
                    flexWrap: "wrap"
                  }}>
                  <Typography variant="h5" sx={{
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
              reviewing={reviewing}
              emptyText={t('finance.withdrawals.detailEmpty')}
              onMarkPaid={openMarkPaid}
              onReject={openReject}
            />

            <WithdrawalReviewDialogs
              payTarget={payTarget}
              rejectTarget={reject}
              busy={reviewing}
              onClosePay={() => setPayTarget(null)}
              onCloseReject={() => setReject(null)}
              onConfirmPay={confirmMarkPaid}
              onSubmitReject={(id, reason) => submit(id, 'REJECTED', reason)}
            />
          </Box>
        );
      }}
    </QueryGuard>
  );
}
