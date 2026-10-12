import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { EarningsSplitView, QueryGuard, StatusChip, VenueBillSummary } from '@duncit/ui';
import { buildVenueBillLines, shellVenueBillLabels } from '@duncit/utils';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import PaymentReleaseReviewForm from '../payment-release-review';
import ReleasePayoutList from './ReleasePayoutList';
import ReleaseMediaGallery from './ReleaseMediaGallery';
import { buildReleaseRequestView } from './release-terms';
import { usePodPaymentRelease } from './usePodPaymentRelease';
import { POD_FINANCE_BREAKDOWN, money, type PodFinanceBreakdown } from '../../pod-finance-page/queries';
import type { PodPaymentReleaseDetail } from '../queries';

function Section({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

type Controller = ReturnType<typeof usePodPaymentRelease>;

function RequestBody({ detail, ctl }: Readonly<{ detail: PodPaymentReleaseDetail; ctl: Controller }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { summary, releases } = detail;
  const view = useMemo(() => buildReleaseRequestView(releases), [releases]);
  const billLabels = useMemo(() => shellVenueBillLabels(t), [t]);
  // The frozen waterfall the payouts were cut from — the same read, and the
  // same four-way split, as Pod Finance.
  const breakdown = useQuery<{ podFinanceBreakdown: PodFinanceBreakdown }>(POD_FINANCE_BREAKDOWN, {
    variables: { podId: summary.pod_id },
    fetchPolicy: 'cache-and-network',
  });
  const waterfall = breakdown.data?.podFinanceBreakdown?.waterfall;
  const billLines = view.terms
    ? buildVenueBillLines(view.terms, billLabels, ctl.symbol).filter(
        (line) => view.hasVenue || view.terms?.bill || line.key === 'attendees',
      )
    : [];

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 3 }}>
        <DuncitIconButton
          aria-label={t('finance.paymentRelease.backToPaymentRelease')}
          onClick={() => navigate('/payment-release')}
        >
          <ArrowBackIcon />
        </DuncitIconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
              {summary.pod_title}
            </Typography>
            <StatusChip status={summary.status} fallbackColor="warning" />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('finance.paymentRelease.totalRequested')}: {money(ctl.symbol, summary.total_requested)}
            {' · '}
            {formatDateTime(summary.requested_at)}
          </Typography>
        </Box>
        {view.pending.length > 0 && (
          <DuncitButton
            variant="contained"
            startIcon={<DoneAllIcon />}
            loading={ctl.approving}
            onClick={() => ctl.approveAll(view.pendingTotal)}
            data-testid="release-approve-all"
          >
            {t('finance.paymentRelease.approveAll')}
          </DuncitButton>
        )}
      </Stack>

      <Stack spacing={2} sx={{ maxWidth: 880 }}>
        {billLines.length > 0 && (
          <Section title={billLabels.title}>
            <VenueBillSummary lines={billLines} billUrl={view.billUrl} viewBillLabel={billLabels.viewBill} />
          </Section>
        )}
        <Section title={t('finance.paymentRelease.payouts')}>
          <ReleasePayoutList releases={releases} symbol={ctl.symbol} onReview={ctl.openReview} />
        </Section>
        {waterfall && (
          <Section title={t('finance.paymentRelease.settlement')}>
            <EarningsSplitView waterfall={waterfall} symbol={ctl.symbol} viewer="staff" />
          </Section>
        )}
        <Section title={t('finance.paymentRelease.podMedia')}>
          <ReleaseMediaGallery media={view.media} />
        </Section>
        {view.notes.length > 0 && (
          <Section title={t('finance.paymentRelease.notes')}>
            <Stack spacing={1}>
              {view.notes.map((note) => (
                <Typography key={note} variant="body2">
                  {note}
                </Typography>
              ))}
            </Stack>
          </Section>
        )}
      </Stack>

      <PaymentReleaseReviewForm
        request={ctl.reviewFor}
        busy={ctl.reviewing}
        errorMessage={ctl.reviewError}
        onClose={ctl.closeReview}
        onSubmit={ctl.submitReview}
      />
    </Box>
  );
}

/** Finance > Payment Release > one pod: its venue bill, every payout on the
 * request, the settlement they were cut from and the pod's media. */
export default function PaymentReleaseDetailPage() {
  const { t } = useTranslation();
  const { requestId } = useParams<{ requestId: string }>();
  const ctl = usePodPaymentRelease(requestId);
  const detail = ctl.detail;

  return (
    <QueryGuard
      loading={ctl.loading && !detail}
      error={detail ? undefined : ctl.error}
      notFound={!detail}
      notFoundText={t('finance.paymentRelease.requestNotFound')}
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() => (detail ? <RequestBody detail={detail} ctl={ctl} /> : null)}
    </QueryGuard>
  );
}
